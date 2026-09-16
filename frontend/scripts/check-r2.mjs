/**
 * The R2 upload machinery, checked without a real bucket.
 *
 * WHY A SCRIPT AND NOT A REAL UPLOAD. `lib/r2.ts` is almost entirely pure --
 * key derivation and SigV4 signing are just string and hash math -- and the
 * two functions that do reach the network (`probeCors`, `probeWrite`) are
 * diagnostics whose BRANCHING is the thing worth pinning, not the specific
 * bytes a real R2 bucket would send back. `fetch` is stubbed here so every
 * branch can be forced on demand, which a live bucket cannot promise on
 * every run.
 *
 * WHAT THIS WOULD HAVE CAUGHT. `presignPut` used to be the only way to sign a
 * request; splitting it into `presignRequest` (any method) plus `presignPut`
 * (PUT, for every real upload) is a refactor with nothing stopping it from
 * quietly changing the one output every existing upload depends on. The first
 * check below is exactly that regression test.
 *
 *   node --experimental-strip-types scripts/check-r2.mjs
 */
import {
  presignPut, presignRequest, probeCors, probeWrite, uploadKey,
} from "../lib/r2.ts";

let failures = 0;
function report(label, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok  " : "FAIL"}  ${label}${ok || !detail ? "" : `  ${detail}`}`);
}

const config = {
  accountId: "acct123",
  bucket: "wdc-onboarding",
  accessKeyId: "AKIDEXAMPLE",
  secretAccessKey: "topsecret",
};

/* ------------------------------------------------------------- the key */

console.log("-- the upload key --");
report("keeps the extension", uploadKey("d1", "logo.PNG").endsWith(".png"));
report("falls back to bin when there is no real extension", uploadKey("d1", "README").endsWith(".bin"));
report("strips anything from the draft id that is not safe in a path",
  !/[^a-zA-Z0-9_/.-]/.test(uploadKey("../../etc", "x.png").replace(/^onboarding\//, "")));
report("two calls for the same file never collide",
  uploadKey("d1", "logo.png") !== uploadKey("d1", "logo.png"));
report("every key sits under its own draft's prefix",
  uploadKey("draft-9", "x.pdf").startsWith("onboarding/draft-9/"));

/* --------------------------------------------------------------- signing */

console.log("-- signing --");
const put = presignPut({ config, key: "onboarding/d1/x.png", contentType: "image/png" });
report("signs against the account's own R2 host", put.url.startsWith(`https://${config.accountId}.r2.cloudflarestorage.com/`));
report("the bucket and key are in the path", put.url.includes(`/${config.bucket}/onboarding/d1/x.png`));
report("carries the five SigV4 query parameters",
  ["X-Amz-Algorithm", "X-Amz-Credential", "X-Amz-Date", "X-Amz-Expires", "X-Amz-SignedHeaders", "X-Amz-Signature"]
    .every((k) => put.url.includes(`${k}=`)));
report("presignPut is presignRequest with the method fixed to PUT",
  put.url === presignRequest({ config, method: "PUT", key: "onboarding/d1/x.png", contentType: "image/png" }).url);
report("a DELETE for the same key signs differently to the PUT",
  presignRequest({ config, method: "DELETE", key: "onboarding/d1/x.png", contentType: "image/png" }).url !== put.url);
/* The content type is SIGNED, not just sent -- if this ever stopped being
   true, a client could request one type and upload another underneath it. */
report("changing the content type changes the signature",
  presignPut({ config, key: "onboarding/d1/x.png", contentType: "application/pdf" }).url !== put.url);
report("changing the key changes the signature",
  presignPut({ config, key: "onboarding/d1/y.png", contentType: "image/png" }).url !== put.url);
report("the public URL is built from the configured base when there is one",
  presignPut({ config: { ...config, publicBase: "https://assets.example.com" }, key: "onboarding/d1/x.png", contentType: "image/png" })
    .publicUrl === "https://assets.example.com/onboarding/d1/x.png");
report("no public URL is offered when the bucket has no public base",
  put.publicUrl === undefined);

/* -------------------------------------------------------- the CORS probe */

console.log("-- probeCors --");

/** Swaps global.fetch for one call, restores it, and reports through it. */
async function withFetch(handler, run) {
  const real = global.fetch;
  global.fetch = handler;
  try { return await run(); } finally { global.fetch = real; }
}

const okOptionsResponse = (overrides = {}) => new Response(null, {
  status: 204,
  headers: {
    "access-control-allow-origin": "https://wedigcreativity.com.ng",
    "access-control-allow-methods": "GET, PUT, POST",
    "access-control-allow-headers": "content-type",
    ...overrides,
  },
});

await withFetch(
  async () => new Response(null, { status: 204 }), // no CORS headers at all
  async () => {
    const v = await probeCors({ config, origin: "https://wedigcreativity.com.ng" });
    report("no Access-Control-Allow-Origin at all reads as not configured for this origin", !v.ok);
  },
);

await withFetch(
  async () => okOptionsResponse({ "access-control-allow-origin": "https://other-domain.example" }),
  async () => {
    const v = await probeCors({ config, origin: "https://wedigcreativity.com.ng" });
    report("an origin that does not match this one is caught", !v.ok);
  },
);

await withFetch(
  async () => okOptionsResponse({ "access-control-allow-methods": "GET, POST" }),
  async () => {
    const v = await probeCors({ config, origin: "https://wedigcreativity.com.ng" });
    report("PUT missing from AllowedMethods is caught", !v.ok);
  },
);

await withFetch(
  async () => okOptionsResponse({ "access-control-allow-headers": "x-requested-with" }),
  async () => {
    const v = await probeCors({ config, origin: "https://wedigcreativity.com.ng" });
    report("content-type missing from AllowedHeaders is caught", !v.ok);
  },
);

await withFetch(
  async () => okOptionsResponse(),
  async () => {
    const v = await probeCors({ config, origin: "https://wedigcreativity.com.ng" });
    report("origin, PUT and content-type all present reads as configured", v.ok);
  },
);

await withFetch(
  async () => { throw new Error("network unreachable"); },
  async () => {
    const v = await probeCors({ config, origin: "https://wedigcreativity.com.ng" });
    report("the bucket not answering at all is caught rather than thrown", !v.ok);
  },
);

/* -------------------------------------------------------- the write probe */

console.log("-- probeWrite --");

await withFetch(
  async (_url, init) => new Response(null, { status: init.method === "DELETE" ? 204 : 200 }),
  async () => {
    const v = await probeWrite({ config });
    report("a successful diagnostic write reads as ok", v.ok);
    report("and does not tell a client to go check the token's permissions",
      !/check.*permission/i.test(v.reason));
  },
);

await withFetch(
  async (_url, init) => new Response(null, { status: init.method === "DELETE" ? 204 : 403 }),
  async () => {
    const v = await probeWrite({ config });
    report("a 403 on the diagnostic write is not ok", !v.ok);
    report("and names the permission scope, since CORS already passed by this point",
      /permission/i.test(v.reason));
  },
);

await withFetch(
  async (_url, init) => new Response(null, { status: init.method === "DELETE" ? 204 : 500 }),
  async () => {
    const v = await probeWrite({ config });
    report("a 500 on the diagnostic write is not ok", !v.ok);
  },
);

await withFetch(
  async () => { throw new Error("dns failure"); },
  async () => {
    const v = await probeWrite({ config });
    report("the diagnostic write itself failing outright is caught, not thrown", !v.ok);
  },
);

console.log(failures === 0 ? "\nAll R2 checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
