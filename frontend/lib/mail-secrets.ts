import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Secrets at rest: AES-256-GCM (encrypted AND authenticated, unlike the CTR
 * mode other tools use), key from the environment, a fresh random IV per
 * value, a version byte so the scheme can change. FAILS CLOSED: with no valid
 * key nothing is saved and nothing is decrypted; there is no built-in key and
 * no plaintext fallback.
 */
const key = () => {
  const hex = process.env.MAIL_SECRETS_KEY?.trim() ?? "";
  return /^[0-9a-f]{64}$/i.test(hex) ? Buffer.from(hex, "hex") : null;
};
export const secretsReady = () => key() !== null;

export function seal(plain: string): string {
  const k = key();
  if (!k) throw new Error("MAIL_SECRETS_KEY is not set.");
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", k, iv);
  const body = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return Buffer.concat([Buffer.from([1]), iv, c.getAuthTag(), body]).toString("base64");
}

export function open(sealed: string): string {
  const k = key();
  if (!k) throw new Error("MAIL_SECRETS_KEY is not set.");
  const buf = Buffer.from(sealed, "base64");
  if (buf[0] !== 1) throw new Error("Unknown secret format.");
  const d = createDecipheriv("aes-256-gcm", k, buf.subarray(1, 13));
  d.setAuthTag(buf.subarray(13, 29));
  return Buffer.concat([d.update(buf.subarray(29)), d.final()]).toString("utf8");
}
