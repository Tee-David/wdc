import { createHash, createHmac } from "node:crypto";

/**
 * Presigned PUT URLs for Cloudflare R2.
 *
 * WHY BY HAND RATHER THAN THE AWS SDK. This is one operation -- sign a PUT --
 * and `@aws-sdk/client-s3` plus `@aws-sdk/s3-request-presigner` is several
 * megabytes of dependency for it. The signing algorithm below is SigV4 in
 * query-string form, which is a fixed, published recipe; it is about seventy
 * lines and it is all here, in one file, rather than behind an abstraction.
 * If R2 ever needs multipart uploads or bucket administration, that is the
 * point to reach for the SDK.
 *
 * WHY PRESIGNED AT ALL. The alternative is posting the file to our own route
 * and streaming it on to R2, which means every byte of every client's logo
 * passes through a serverless function with a request body limit and an
 * execution timeout. A presigned URL lets the browser PUT straight to R2: the
 * server only ever handles the small JSON that authorises it, and the upload
 * gets real progress events because it is a single request the browser owns.
 *
 * WHAT THE SERVER STILL DECIDES. Everything that matters: the key (the client
 * never chooses where its file lands), the content type, the size ceiling and
 * how long the URL is good for. A presigned URL is a capability, so it is
 * issued narrowly and briefly.
 */

const SERVICE = "s3";
/** R2 has one region and it is spelled "auto". */
const REGION = "auto";

export type R2Config = {
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** The public base the uploaded object is readable from, if the bucket has one. */
  publicBase?: string;
};

/**
 * Reads the configuration, or explains exactly what is missing.
 *
 * Returning the reason rather than throwing a generic error: "R2 is not
 * configured" in a log at three in the morning is a worse message than
 * "CLOUDFLARE_ACCOUNT_ID is not set".
 */
export function r2Config(): { ok: true; config: R2Config } | { ok: false; missing: string[] } {
  /* The account id can come either as itself or as the S3 API endpoint
     Cloudflare shows on the bucket page, which has it as the subdomain. Taking
     both means whichever one is to hand in the dashboard is the right answer.
     R2_ACCOUNT_ID stays accepted so the name matches the other R2_* docs. */
  const accountId =
    process.env.CLOUDFLARE_ACCOUNT_ID ||
    process.env.R2_ACCOUNT_ID ||
    process.env.CLOUDFLARE_S3_API?.match(
      /^https?:\/\/([^.]+)\.r2\.cloudflarestorage\.com/i,
    )?.[1];
  /* BUCKET_NAME is what the project's .env already calls it; R2_BUCKET is
     accepted too so the name matches the other R2_* variables if it is ever
     tidied up. */
  const bucket = process.env.BUCKET_NAME || process.env.R2_BUCKET;
  const accessKeyId = process.env.ACCESS_KEY_ID;
  const secretAccessKey = process.env.SECRET_ACCESS_KEY;

  const missing = [
    ["CLOUDFLARE_ACCOUNT_ID", accountId],
    ["BUCKET_NAME", bucket],
    ["ACCESS_KEY_ID", accessKeyId],
    ["SECRET_ACCESS_KEY", secretAccessKey],
  ]
    .filter(([, v]) => !v)
    .map(([k]) => k as string);

  if (missing.length) return { ok: false, missing };

  return {
    ok: true,
    config: {
      accountId: accountId as string,
      bucket: bucket as string,
      accessKeyId: accessKeyId as string,
      secretAccessKey: secretAccessKey as string,
      publicBase: process.env.CLOUDFLARE_R2_URL?.replace(/\/+$/, ""),
    },
  };
}

const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const hmac = (key: Buffer | string, value: string) => createHmac("sha256", key).update(value).digest();

/**
 * RFC 3986, not `encodeURIComponent`. The difference is the four characters
 * `!'()*`, which encodeURIComponent leaves alone and the signature does not:
 * get this wrong and a filename with a bracket in it fails to authorise while
 * every other file works, which is a miserable thing to debug.
 */
function uriEncode(value: string, encodeSlash = true) {
  let out = "";
  for (const ch of Buffer.from(value, "utf8").toString("binary")) {
    if (/[A-Za-z0-9._~-]/.test(ch)) out += ch;
    else if (ch === "/") out += encodeSlash ? "%2F" : "/";
    else out += "%" + ch.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0");
  }
  return out;
}

/**
 * A key the client cannot influence beyond the extension.
 *
 * The filename a browser hands over is attacker-controlled text: it can carry
 * path separators, null bytes, a leading dot, or six hundred characters of
 * unicode. None of that is allowed to decide where an object lands, so the key
 * is built here from a server-chosen id and the original name is kept only as
 * metadata for whoever reads the brief.
 */
export function uploadKey(draftId: string, filename: string) {
  const safeDraft = draftId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "unknown";
  const ext = (filename.match(/\.([a-zA-Z0-9]{1,8})$/)?.[1] ?? "bin").toLowerCase();
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `onboarding/${safeDraft}/${stamp}-${rand}.${ext}`;
}

/**
 * A presigned PUT, good for `expiresIn` seconds.
 *
 * `contentType` is signed, which means the browser must send exactly that type
 * or R2 rejects the request. That is the point: the URL authorises uploading
 * one PNG, not "anything at all to this key".
 */
export function presignPut({
  config,
  key,
  contentType,
  expiresIn = 300,
}: {
  config: R2Config;
  key: string;
  contentType: string;
  expiresIn?: number;
}) {
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const canonicalUri = `/${uriEncode(config.bucket, false)}/${uriEncode(key, false)}`;

  /* Content-Type is signed as well as Host, so the query has to declare both
     and the browser has to send both. They are listed alphabetically because
     SigV4 requires it, not as a style choice. */
  const signedHeaders = "content-type;host";
  const query: Array<[string, string]> = [
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Credential", `${config.accessKeyId}/${scope}`],
    ["X-Amz-Date", amzDate],
    ["X-Amz-Expires", String(expiresIn)],
    ["X-Amz-SignedHeaders", signedHeaders],
  ];
  const canonicalQuery = query
    .map(([k, v]) => [uriEncode(k), uriEncode(v)] as const)
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\n`;
  const canonicalRequest = [
    "PUT",
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    /* UNSIGNED-PAYLOAD because the body is the file and the server never sees
       it. The signature covers who, what key, what type and for how long. */
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256(canonicalRequest),
  ].join("\n");

  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${config.secretAccessKey}`, dateStamp), REGION), SERVICE),
    "aws4_request",
  );
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");

  const url = `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
  const publicUrl = config.publicBase ? `${config.publicBase}/${key}` : undefined;

  return { url, publicUrl, key, expiresIn };
}
