/**
 * Opens a backup made by backup-export.mjs and proves it is whole: decrypts,
 * checks the SHA-256, and compares every table's row count to the manifest.
 * It never connects to a database.
 *
 *   BACKUP_KEY=<hex> node scripts/restore-check.mjs <file>
 */
import fs from "node:fs";
import { createDecipheriv, createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";

const file = process.argv[2];
const key = process.env.BACKUP_KEY ?? "";
if (!file || !/^[0-9a-f]{64}$/i.test(key)) throw new Error("Usage: BACKUP_KEY=<64 hex> node scripts/restore-check.mjs <file>");
const buf = fs.readFileSync(file);
if (buf.subarray(0, 5).toString() !== "WDCB1") throw new Error("Not a WDC backup.");
const d = createDecipheriv("aes-256-gcm", Buffer.from(key, "hex"), buf.subarray(5, 17));
d.setAuthTag(buf.subarray(17, 33));
const plain = Buffer.concat([d.update(buf.subarray(33)), d.final()]); // throws if the key is wrong or the file was altered
const mlen = plain.readUInt32BE(0);
const manifest = JSON.parse(plain.subarray(4, 4 + mlen).toString());
const body = plain.subarray(4 + mlen);
if (createHash("sha256").update(body).digest("hex") !== manifest.sha256) throw new Error("Checksum mismatch.");
const seen = {};
for (const line of gunzipSync(body).toString().split("\n")) if (line) seen[JSON.parse(line).t] = (seen[JSON.parse(line).t] ?? 0) + 1;
for (const [t, n] of Object.entries(manifest.tables)) if ((seen[t] ?? 0) !== n) throw new Error(`Table ${t}: ${seen[t] ?? 0} rows, expected ${n}.`);
console.log(`OK: ${Object.keys(manifest.tables).length} tables, taken ${manifest.at}.`);
