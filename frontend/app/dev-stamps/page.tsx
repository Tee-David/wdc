import { notFound } from "next/navigation";
import Stamp, { STAMP_STATES, type StampStatus } from "@/components/money/stamp";

/* A sheet of every stamp, for looking at them together.

   DEV ONLY, and it enforces that itself rather than trusting a robots rule.
   In production it is a genuine 404, not a blank page: an empty route that
   responds 200 is one a crawler will index and one somebody will link to. */
export const dynamic = "force-static";

export default function DevStamps() {
  if (process.env.NODE_ENV === "production") notFound();
  const all = Object.keys(STAMP_STATES) as StampStatus[];
  return (
    <main style={{ background: "#f6f6f4", minHeight: "100vh", padding: "2rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1.5rem", maxWidth: "64rem", margin: "0 auto" }}>
        {all.map((k) => (
          <figure key={k} style={{ margin: 0, background: "#fff", borderRadius: 14, padding: "1.2rem", textAlign: "center" }}>
            <div style={{ width: 150, margin: "0 auto" }}><Stamp status={k} seed={k} /></div>
            <figcaption style={{ marginTop: ".6rem", fontSize: ".78rem", color: "#5a5a72", fontFamily: "monospace" }}>{k}</figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}
