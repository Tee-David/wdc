import { qrCode, type QrOptions } from "@/lib/qr";

import "./qr-code.css";

/**
 * A QR code with our mark in the middle, wherever one is needed.
 *
 * A server component: the SVG is generated during the render that produces the
 * page, so the reader downloads a picture rather than an encoder, and there is
 * no client JavaScript involved at any point.
 *
 * THE ANIMATION IS CSS, NOT A GIF. The ask was for an animated code with the
 * favicon inside it, in the manner of `x-hw/amazing-qr`. The reasons that
 * library is not here are written at the top of lib/qr.ts; the short version is
 * that it is Python, that every code on this site encodes a different URL so
 * one GIF cannot be reused, and that a GIF of a QR code weighs two hundred
 * times what this SVG does while making the pattern harder for a camera to
 * read.
 *
 * So the mark is genuinely embedded -- punched into the code at error
 * correction level H -- and the life comes from two compositor-only
 * animations: the mark settles in once when the code first appears, and then
 * breathes very slightly. No bytes, no main-thread work, and both stop dead
 * under `prefers-reduced-motion`.
 */
export default async function QrCode({
  url,
  label,
  className = "",
  boxPx,
  animate = true,
  ...options
}: {
  url: string;
  /** Describes the destination for anyone who cannot see the code. */
  label: string;
  className?: string;
  animate?: boolean;
  /**
   * How wide the code is allowed to get, in px.
   *
   * A SIZE IS A SCANNABILITY DECISION, not a layout one. Longer data means
   * more and finer modules in the same box, and past a point a camera cannot
   * resolve them. The default suits a short article URL; the money documents
   * pass 160 because their codes measurably do not decode below it.
   */
  boxPx?: number;
} & QrOptions) {
  const { svg, size, coverage } = await qrCode(url, {
    logo: "/brand/icon-navy.svg",
    ...options,
  });

  if (process.env.NODE_ENV !== "production" && coverage > 0.12) {
    /* Level H recovers 30%, and a contiguous block is the worst shape for
       recovery. Anything approaching that is a code that scans on the desk and
       fails in a car park. */
    console.warn(`[qr] mark covers ${(coverage * 100).toFixed(1)}% of a ${size}-module code`);
  }

  /* THE LABEL IS NOT PRINTED. Wherever this sits, the surrounding copy has
     already said what it is -- "Take it with you" above it on an article. A
     caption repeating "scan this" under a QR code is telling a sighted reader
     something the shape already told them. It stays as the accessible name, so
     a screen reader still learns what the picture is for. */
  return (
    <figure
      className={`qr ${animate ? "qr--live" : ""} ${className}`.trim()}
      role="img"
      aria-label={label}
      style={boxPx ? ({ "--qr-size": `${boxPx}px` } as React.CSSProperties) : undefined}
    >
      <div className="qr__code">
        <div
          className="qr__svg"
          /* Server-generated from a URL we built; no user input reaches it. */
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        {/* The sweep. Decorative and inert -- it is a sibling of the code
            rather than anything the code depends on, so a browser that ignores
            it entirely still renders a scannable QR. */}
        {animate ? <span className="qr__sweep" aria-hidden="true" /> : null}
      </div>
    </figure>
  );
}
