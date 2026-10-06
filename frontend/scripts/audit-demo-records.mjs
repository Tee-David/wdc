/** Read-only candidate audit. No deletion option exists. Never loads repository .env. */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
const args = process.argv.slice(2);
function option(name) { const at=args.indexOf(name); return at < 0 ? "" : args[at+1] ?? ""; }
if (args.includes("--apply")) throw new Error("Deletion is not implemented. Review provenance and checkpoint with the owner first.");
const raw = process.env.WDC_DEMO_AUDIT_DATABASE_URL;
if (!raw) throw new Error("Set WDC_DEMO_AUDIT_DATABASE_URL explicitly; application database variables are never inherited.");
let url;
try { url = new URL(raw); } catch { throw new Error("The explicit audit target URL is invalid."); }
const target = option("--database-name");
if (!target || decodeURIComponent(url.pathname.slice(1)) !== target) throw new Error("Explicit database name must match the selected connection target.");
const checkpoint=option("--checkpoint");
if (!checkpoint || !fs.statSync(checkpoint).isFile()) throw new Error("Provide an existing checkpoint export path before inspecting cleanup candidates.");
const output=option("--output");
if (!output || fs.existsSync(output)) throw new Error("Choose a new output file path; existing artifacts are never overwritten.");
const manifest=JSON.parse(fs.readFileSync(new URL("../../docs/audits/legacy-demo-records.json",import.meta.url),"utf8"));
url.searchParams.delete("sslmode");
const configured = process.env.COCKROACHDB_CERT ?? "";
const local = process.env.APPDATA ? path.join(process.env.APPDATA,"postgresql","root.crt") : "";
const ca = configured.startsWith("-----BEGIN CERTIFICATE-----") ? configured.replace(/\\n/g,"\n") : local && fs.existsSync(local) ? fs.readFileSync(local,"utf8") : undefined;
const pool = new pg.Pool({connectionString:url.toString(),ssl:{rejectUnauthorized:true,...(ca?{ca}:{})},max:1});
try {
 const actual = await pool.query("SELECT current_database() AS name");
 if (actual.rows[0]?.name !== target) throw new Error("Connected database differs from the reviewed explicit target.");
 const records=[];
 for (const candidate of manifest.records) {
  const result=await pool.query("SELECT collection,id,data FROM admin_records WHERE collection=$1 AND id=$2",[candidate.collection,candidate.id]);
  if(result.rows[0]) records.push({candidate,persisted:result.rows[0],decision:"UNREVIEWED: ID match is not demo provenance; compare full record, descendants and edits before deletion."});
 }
 fs.writeFileSync(output,JSON.stringify({databaseName:target,checkpoint: path.resolve(checkpoint),createdAt:new Date().toISOString(),mode:"READ ONLY",records},null,2),{flag:"wx"});
 console.log(`Read-only audit wrote ${records.length} candidate matches. No database records changed.`);
} finally { await pool.end(); }
