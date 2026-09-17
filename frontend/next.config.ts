import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { NextConfig } from "next";

/**
 * THE ENVIRONMENT LIVES ONE DIRECTORY UP.
 *
 * `.env` is at the repository root and the app is in `frontend/`, so Next
 * never loads it: it only looks in the project directory. Nothing said so.
 * `next build` simply failed with "Failed to collect page data" because a
 * module read `COCKROACHDB_URL` and found nothing, and every R2, SMTP and
 * Paystack value was equally invisible to `next dev` on a fresh clone.
 *
 * Read it here instead. Three rules make this safe:
 *  - a variable already set always wins, so Vercel's dashboard and a real
 *    shell export are never overridden by a stale file;
 *  - the file is optional, so a deployment that has no repo checkout (which
 *    is every deployment) behaves exactly as it does today;
 *  - the BOM is stripped, because this file has one and it would otherwise
 *    become part of the first variable's NAME, which is invisible and
 *    maddening.
 */
function loadRepoRootEnv() {
  const file = join(process.cwd(), "..", ".env");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").replace(/^﻿/, "").split(/\r?\n/)) {
    const text = line.trim();
    if (!text || text.startsWith("#")) continue;
    const at = text.indexOf("=");
    if (at < 1) continue;
    const key = text.slice(0, at).trim();
    if (process.env[key] !== undefined) continue;
    process.env[key] = text.slice(at + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
  }
}
loadRepoRootEnv();

/**
 * The config was empty. Everything here is measured, not speculative.
 *
 * IMAGES. `next/image` was used nowhere on the site -- 23 raw `<img>` tags --
 * so nothing was resized per device and nothing was served as AVIF or WebP.
 * `public/` is 20MB of JPEG and PNG, and on emulated mobile the homepage was
 * spending 1.04MB of a 1.10MB payload on images for a 5.4s LCP. Good is 2.5s.
 * Turning the optimiser on is the single largest lever available.
 *
 * AVIF FIRST, WebP SECOND. Next negotiates by the browser's Accept header and
 * takes the first format it supports, so the order is the preference. AVIF is
 * roughly 20-30% smaller than WebP on photographic content at matched quality,
 * which is what almost every image here is. It costs more CPU to encode, but
 * that is paid once per size on the server and cached.
 *
 * (The reference site sets `images.unoptimized: true` as a workaround for a
 * mobile bug and thereby disables all of this. Deliberately not inherited.)
 *
 * `qualities` has to be declared in Next 16 for any value other than the
 * default 75 to be allowed at the call site.
 */
const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    /* The widths actually requested by this site's `sizes` attributes. Trimming
       the default list means fewer variants to encode and cache without any
       call site losing the width it asks for. */
    deviceSizes: [390, 640, 828, 1080, 1280, 1600, 1920],
    imageSizes: [64, 96, 128, 256, 384, 560],
    qualities: [70, 78, 85],
    /* A year. The files are content-addressed by the optimiser's own hash of
       the source plus the requested width and quality, so a changed source is a
       changed URL and a long life is safe. */
    minimumCacheTTL: 31_536_000,
  },

  /* Tree-shakes the icon barrel files. `lucide-react` and `simple-icons` both
     re-export thousands of icons from one entry point, and without this a
     single named import can pull the whole module graph into the bundle. */
  experimental: {
    optimizePackageImports: [
      "lucide-react", "simple-icons", "motion-icons-react",
      /* Added with the admin: its tables and figures import a handful of
         helpers from each of these, and both are barrels. */
      "date-fns", "recharts",
    ],
  },

  /* The stack trace in a production error page names our own file paths.
     Nobody outside needs them and they are a small gift to anyone probing. */
  productionBrowserSourceMaps: false,
  poweredByHeader: false,

  /* ==========================================================================
     HEADERS

     There were none. Every one of these is a header a browser will enforce for
     us if we send it and will not if we do not, so the cost of omitting them
     is paid entirely by the reader.

     THE CSP IS THE ONE THAT NEEDS CARE, because a wrong one breaks the site
     silently: a blocked script does not error where anyone looks, it simply
     never runs. Two third parties have to be allowed by name or they fail
     exactly that way -- Jotform, whose agent is the whole chat widget, and
     UserWay, whose widget is the accessibility menu. Both were checked against
     what the pages actually request rather than guessed.

     `unsafe-inline` and `unsafe-eval` are in `script-src` and it is worth
     saying why rather than pretending otherwise: Next inlines its bootstrap
     and its flight data as inline scripts, next-themes writes its
     theme-before-paint script inline, and both third-party widgets evaluate
     code they fetch. A nonce-based policy is the right end state and it
     requires moving these routes off static generation, which would cost more
     than it buys today. This is written down so the trade is visible rather
     than accidental.
     ========================================================================== */
  async headers() {
    /* THE FILE STORE HAS TO BE IN `connect-src`, OR NO UPLOAD EVER LEAVES THE
       PAGE. Uploads are a presigned PUT from the browser straight to R2, and
       with `'self'` alone the browser blocked every one before it was sent --
       the page saw the same bare `onerror` a dropped connection gives, and
       the server's own checks (CORS, a test write) all passed, because none
       of them run under this policy. The exact account host when the build
       knows it, R2's domain when it does not. */
    const r2Account =
      process.env.CLOUDFLARE_ACCOUNT_ID ||
      process.env.R2_ACCOUNT_ID ||
      process.env.CLOUDFLARE_S3_API?.match(/^https?:\/\/([^.]+)\.r2\.cloudflarestorage\.com/i)?.[1];
    const r2Host = r2Account
      ? `https://${r2Account}.r2.cloudflarestorage.com`
      : "https://*.r2.cloudflarestorage.com";

    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      /* PAYSTACK IS HERE BECAUSE `form-action` FOLLOWS REDIRECTS.

         The pay button is a form posting to our own route, which answers with
         a 303 to Paystack's hosted checkout. Browsers apply `form-action` to
         every hop of that redirect chain, not only to the URL in the `action`
         attribute -- so with `'self'` alone the checkout is blocked silently,
         after the transaction has already been created on Paystack's side.
         Named hosts rather than a wildcard: this is the one directive that
         decides where a payment form may send somebody. */
      "form-action 'self' https://checkout.paystack.com https://*.paystack.com",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jotfor.ms https://*.jotform.com https://cdn.userway.org https://*.userway.org",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.jotform.com https://*.userway.org",
      "font-src 'self' data: https://fonts.gstatic.com https://*.userway.org",
      "img-src 'self' data: blob: https:",
      "media-src 'self' https://*.jotform.com",
      `connect-src 'self' ${r2Host} https://*.jotform.com https://cdn.jotfor.ms https://*.userway.org https://api.userway.org`,
      /* The chat renders in an iframe from Jotform's own origin, and the
         preview modal embeds client sites. */
      "frame-src 'self' https://*.jotform.com https://*.jotfor.ms https:",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      "upgrade-insecure-requests",
    ].join("; ");

    const base = [
      { key: "Content-Security-Policy", value: csp },
      /* Two years and preloadable. Only safe because every route is https
         already; a site still serving anything over http would lock itself
         out of it for the duration. */
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      /* Nothing here uses any of them, so nothing here should be able to ask.
         This is also what stops an embedded third party asking on our behalf. */
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    ];

    return [
      { source: "/:path*", headers: base },
      {
        /* ONLY THE CANONICAL DOMAIN IS INDEXABLE.
           wedigcreativity.vercel.app serves the complete site and returned a
           normal, indexable response, so search engines had a second full copy
           of every page and had to guess which was canonical. The pages do
           declare a canonical URL, which is probably why the damage has been
           limited, but a canonical tag is ADVISORY and a robots header is
           binding -- and both earlier audits reported seeing a second version
           of the site in results.

           A header rather than a redirect, deliberately: Vercel preview
           deployments live on this domain too, and redirecting them to
           production would make every preview untestable. This keeps them
           reachable and keeps them out of the index. */
        source: "/:path*",
        has: [{ type: "host", value: "(?<preview>.*\\.vercel\\.app)" }],
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        /* Content-addressed by the build, so a change is a new URL and a year
           is safe. Without this Next sends its own shorter default and every
           repeat visit revalidates files that cannot have changed. */
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/fonts/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        /* NOT immutable, and this one matters. The worker is how every client
           finds out a new version exists; cached for a year it would pin
           people to whatever build they first met, offline page included. */
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/offline.html",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
      {
        /* The admin is never cached and never indexed. */
        source: "/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        /* Same rule, same reason, for the client portal: it carries the
           same class of per-account financial and project data. */
        source: "/portal/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
