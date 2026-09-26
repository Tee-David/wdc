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
      publicBase: r2PublicBase(),
    },
  };
}

/**
 * The bucket's public address, as an origin a browser can load from.
 * `CLOUDFLARE_R2_URL` is often pasted without its scheme ("pub-x.r2.dev"),
 * which made every uploaded picture a relative path that 404ed on our own
 * domain and failed the post's "is this our bucket" check, so the picture
 * was dropped from the article. The scheme is added here, once, for every
 * reader.
 */
export function r2PublicBase(): string | undefined {
  const raw = process.env.CLOUDFLARE_R2_URL?.trim().replace(/\/+$/, "");
  if (!raw) return undefined;
  return /^https?:\/\//i.test(raw) ? raw.replace(/^http:/i, "https:") : `https://${raw}`;
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
 * A media library key, dated so the bucket stays browsable by month. The
 * extension comes from the server's own table (see `lib/media-validate.ts`),
 * never from the filename directly.
 */
export function mediaKey(ext: string, at = new Date()) {
  const month = String(at.getUTCMonth() + 1).padStart(2, "0");
  const stamp = at.getTime().toString(36);
  const rand = Math.random().toString(36).slice(2, 10).padEnd(6, "0");
  return `media/${at.getUTCFullYear()}/${month}/${stamp}-${rand}.${ext}`;
}

/**
 * A presigned request, good for `expiresIn` seconds.
 *
 * `contentType` is signed, which means the caller must send exactly that type
 * or R2 rejects the request. That is the point for a PUT: the URL authorises
 * uploading one PNG, not "anything at all to this key". `method` defaults to
 * PUT, which is every real upload; DELETE exists for `probeWrite` below,
 * which cleans up after the tiny object it writes to prove the credentials
 * actually can; HEAD is `headObject`, which asks what actually arrived.
 */
export function presignRequest({
  config,
  method = "PUT",
  key,
  contentType,
  expiresIn = 300,
}: {
  config: R2Config;
  method?: "PUT" | "DELETE" | "HEAD";
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
     and the caller has to send both. They are listed alphabetically because
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
    method,
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

/** The PUT case, which is every real upload. Kept as its own name because
    that is what every call site outside this file means. */
export function presignPut(args: {
  config: R2Config;
  key: string;
  contentType: string;
  expiresIn?: number;
}) {
  return presignRequest({ ...args, method: "PUT" });
}

/**
 * WHAT ACTUALLY ARRIVED, asked of the bucket rather than the browser.
 *
 * A browser that says "I uploaded 2MB of PNG" is describing what it meant to
 * do. R2 knows what it stored. Recording the second is what lets a row be
 * trusted: the size is R2's Content-Length, and a key nobody uploaded to
 * answers 404 and is never recorded at all.
 */
export async function headObject({
  config, key, timeoutMs = 6000,
}: {
  config: R2Config;
  key: string;
  timeoutMs?: number;
}): Promise<{ ok: true; bytes: number; contentType: string } | { ok: false; status: number }> {
  /* The signature covers a content-type header, so one is sent; R2 ignores it
     on a HEAD and answers with the stored object's own type. */
  const contentType = "application/octet-stream";
  const head = presignRequest({ config, method: "HEAD", key, contentType, expiresIn: 60 });
  try {
    const res = await fetch(head.url, {
      method: "HEAD",
      headers: { "content-type": contentType },
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, status: res.status };
    return {
      ok: true,
      bytes: Number(res.headers.get("content-length") ?? -1),
      contentType: res.headers.get("content-type") ?? "",
    };
  } catch {
    return { ok: false, status: 0 };
  }
}

/**
 * DELETE ONE OBJECT, for "Delete permanently" in the media library's Trash.
 * S3 answers 204 whether or not the key existed, so running it twice is safe:
 * a retry after a half-finished delete finishes it rather than failing.
 */
export async function deleteObject({ config, key, timeoutMs = 8000 }: { config: R2Config; key: string; timeoutMs?: number }): Promise<boolean> {
  const contentType = "application/octet-stream";
  const del = presignRequest({ config, method: "DELETE", key, contentType, expiresIn: 60 });
  try {
    const res = await fetch(del.url, { method: "DELETE", headers: { "content-type": contentType }, signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}

/**
 * ASK THE BUCKET WHY, BECAUSE THE BROWSER WILL NOT SAY.
 *
 * A cross-origin PUT that CORS refuses is cancelled before it is sent: the
 * status stays 0, `xhr.onerror` fires, and the page cannot tell a blocked
 * request from a dropped connection. That is deliberate in the platform and
 * it is not going to change, so the page will always be guessing.
 *
 * The SERVER is not guessing. It can send the same preflight the browser would
 * have sent, from somewhere CORS does not apply, and read what R2 answers. The
 * result is the difference between "we could not reach the file store" -- which
 * sends somebody to check their wifi over a bucket setting -- and "the bucket
 * does not allow PUT from https://wedigcreativity.com.ng", which names the
 * thing to change and where.
 *
 * A preflight is never signed: browsers strip credentials from it, so R2
 * answers it from the bucket's CORS policy alone and this needs no signature
 * either. It creates nothing; the key is never written.
 */
export type CorsVerdict = {
  /** True when a browser's PUT would be allowed through. */
  ok: boolean;
  /** One line for the person filling the form. */
  reason: string;
  /** Everything worth having in the log. */
  detail: string;
};

export async function probeCors({
  config, origin, timeoutMs = 5000,
}: {
  config: R2Config;
  origin: string;
  timeoutMs?: number;
}): Promise<CorsVerdict> {
  const url =
    `https://${config.accountId}.r2.cloudflarestorage.com` +
    `/${uriEncode(config.bucket, false)}/cors-preflight-probe`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "OPTIONS",
      headers: {
        origin,
        "access-control-request-method": "PUT",
        "access-control-request-headers": "content-type",
      },
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch (e) {
    /* The bucket did not answer us either, so this is not about the browser. */
    return {
      ok: false,
      reason: "The file store is not answering. This is on us, not on your connection.",
      detail: `preflight to ${url} failed outright: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  const allowOrigin = res.headers.get("access-control-allow-origin");
  const allowMethods = res.headers.get("access-control-allow-methods") ?? "";
  const allowHeaders = res.headers.get("access-control-allow-headers") ?? "";
  const has = (list: string, want: string) =>
    list.trim() === "*" ||
    list.toLowerCase().split(",").map((x) => x.trim()).includes(want);

  const detail =
    `origin=${origin} status=${res.status} ` +
    `allow-origin=${allowOrigin ?? "(none)"} ` +
    `allow-methods=${allowMethods || "(none)"} ` +
    `allow-headers=${allowHeaders || "(none)"}`;

  if (!allowOrigin) {
    return {
      ok: false,
      reason: "The file store is not accepting uploads from this site yet.",
      detail:
        `the bucket returned no Access-Control-Allow-Origin, so its CORS policy does not cover ${origin}. ` +
        `Add it to the bucket's CORS policy as an AllowedOrigin. ${detail}`,
    };
  }
  if (allowOrigin !== "*" && allowOrigin !== origin) {
    return {
      ok: false,
      reason: "The file store is not accepting uploads from this site yet.",
      detail:
        `the bucket allows ${allowOrigin} but this request came from ${origin}. ` +
        `these have to match exactly, including the scheme and any www. ${detail}`,
    };
  }
  if (!has(allowMethods, "put")) {
    return {
      ok: false,
      reason: "The file store is not accepting uploads from this site yet.",
      detail: `the bucket's CORS policy does not list PUT in AllowedMethods. ${detail}`,
    };
  }
  if (!has(allowHeaders, "content-type")) {
    return {
      ok: false,
      reason: "The file store is not accepting uploads from this site yet.",
      detail:
        `the bucket's CORS policy does not allow the content-type header, and the upload has to send it ` +
        `because the presigned URL signs it. Add content-type to AllowedHeaders. ${detail}`,
    };
  }

  return {
    ok: true,
    reason: "The upload did not finish. It is worth trying again.",
    detail: `CORS is correct for this origin, so the upload failed in transit. ${detail}`,
  };
}

/**
 * ASK THE BUCKET WHETHER THESE CREDENTIALS CAN ACTUALLY WRITE, because a CORS
 * pass does not mean that.
 *
 * A WRONG-PERMISSION TOKEN LOOKS EXACTLY LIKE A DROPPED CONNECTION FROM THE
 * BROWSER'S SEAT. CORS and authorisation are two separate checks R2 makes,
 * and the browser only shows its own work for the first one: a token that can
 * sign a request but is scoped to read-only, or to a different bucket, gets a
 * 403 from R2 same as a bad signature would -- and several S3-compatible
 * error responses, this one included in practice, do not carry
 * Access-Control-Allow-Origin on the ERROR body the way they do on a success.
 * Without that header the browser refuses to hand the response to JavaScript
 * at all, so `xhr.onerror` fires: the exact same event a genuinely dropped
 * connection produces. `probeCors` above rules out the bucket's CORS policy;
 * this rules out (or confirms) the token's own permissions, and it can,
 * because a request made from THIS SERVER is never subject to CORS in the
 * first place -- CORS is a browser rule, not an R2 one.
 *
 * IT WRITES A REAL, TINY OBJECT rather than trying to infer permission from a
 * HEAD or a list, because a token can easily be scoped to List and Read
 * without Write, and that combination is exactly the misconfiguration this
 * exists to catch. The object is cleaned up afterward on a best-effort basis;
 * leaving one three-byte file behind on a failed delete is a smaller cost
 * than not running this check at all.
 */
export async function probeWrite({
  config, timeoutMs = 6000,
}: {
  config: R2Config;
  timeoutMs?: number;
}): Promise<CorsVerdict> {
  const key = `onboarding/_diagnostic/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const contentType = "text/plain";
  const put = presignRequest({ config, method: "PUT", key, contentType, expiresIn: 60 });

  let status = 0;
  try {
    const res = await fetch(put.url, {
      method: "PUT",
      headers: { "content-type": contentType },
      body: "diagnostic",
      signal: AbortSignal.timeout(timeoutMs),
    });
    status = res.status;
  } catch (e) {
    return {
      ok: false,
      reason: "We could not reach the file store from our own server just now. This is on us, not on your connection.",
      detail: `diagnostic PUT to ${key} threw outright: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  /* Cleanup is not awaited: whether it succeeds or not has no bearing on the
     verdict this function already has, and there is nothing useful to do
     with a delete failure here beyond noting it. */
  const del = presignRequest({ config, method: "DELETE", key, contentType, expiresIn: 60 });
  void fetch(del.url, { method: "DELETE", headers: { "content-type": contentType }, signal: AbortSignal.timeout(timeoutMs) })
    .catch((e) => console.error(`[r2] diagnostic cleanup delete for ${key} failed: ${e instanceof Error ? e.message : String(e)}`));

  if (status >= 200 && status < 300) {
    return {
      ok: true,
      reason: "The upload did not finish, and it is not the bucket's permissions either -- worth trying again.",
      detail: `diagnostic PUT to ${key} from this server succeeded (status ${status}), so this credential can write here.`,
    };
  }
  return {
    ok: false,
    reason: status === 403
      ? "The upload credentials can sign a request but are not allowed to write to this bucket. Check the R2 API token's permissions in the Cloudflare dashboard -- it needs Object Read & Write, not Read only."
      : `The file store refused a write from our own server (status ${status}). Check the bucket name and the token's permissions.`,
    detail: `diagnostic PUT to ${key} from this server returned status ${status}.`,
  };
}
