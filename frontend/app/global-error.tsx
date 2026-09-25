"use client";

/**
 * THE LAST RESORT: the root layout itself failed, so none of the site's
 * styles or chrome can be relied on. Plain HTML, inline styles, the same
 * three ways forward as app/error.tsx.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#030318", color: "#f1f2ff", fontFamily: "system-ui, sans-serif", padding: "24px" }}>
        <main style={{ maxWidth: 520, textAlign: "center" }}>
          <h1 style={{ fontSize: 28, margin: "0 0 12px" }}>This page did not load.</h1>
          <p style={{ margin: "0 0 24px", lineHeight: 1.6, color: "#c9cae8" }}>
            Something failed on our side. Nothing you did caused it.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button type="button" onClick={() => reset()} style={{ minHeight: 44, padding: "0 20px", borderRadius: 10, border: "1px solid #fff", background: "#fff", color: "#0a0a0a", fontWeight: 700, cursor: "pointer" }}>Try again</button>
            {/* A plain link on purpose: the router may be what failed. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ minHeight: 44, padding: "0 20px", display: "inline-flex", alignItems: "center", borderRadius: 10, border: "1px solid #fff", color: "#fff", fontWeight: 700, textDecoration: "none" }}>Go to the homepage</a>
          </div>
          <p style={{ marginTop: 24, fontSize: 14, color: "#c9cae8" }}>
            Still stuck? Email <a href="mailto:info@wedigcreativity.com.ng" style={{ color: "#fff" }}>info@wedigcreativity.com.ng</a>.
          </p>
        </main>
      </body>
    </html>
  );
}
