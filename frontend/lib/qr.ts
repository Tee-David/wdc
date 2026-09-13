import QRCode from "qrcode";

/**
 * A QR code for a page, rendered as inline SVG on the server.
 *
 * WHY SERVER-SIDE. The code never changes for a given URL, so generating it in
 * the browser would ship an encoder to every reader to compute the same answer
 * every time. Rendered here it is part of the HTML, costs no client JavaScript,
 * needs no network request, and works with scripting disabled.
 *
 * WHY A LIBRARY AT ALL, given this repo's rule about not adding packages: a QR
 * code is not a UI effect. It is Reed-Solomon error correction, bit
 * interleaving and mask selection, and a hand-rolled version would be a hundred
 * lines of exactly the kind of code whose bugs only show up on somebody else's
 * phone camera. It is also server-only, so it adds nothing to the bundle a
 * reader downloads.
 *
 * The colours are passed in rather than baked, so the same helper serves the
 * blog now and the invoice and receipt documents in the admin later.
 */

export type QrOptions = {
  /** Foreground, usually the brand navy or the page ink. */
  dark?: string;
  /** Background. `#0000` keeps it transparent so it sits on any surface. */
  light?: string;
  /** Quiet zone in modules. The spec says 4; 0 is right when the surrounding
      layout already provides the margin. */
  margin?: number;
  /** Error correction. "M" survives a printed invoice being folded. */
  level?: "L" | "M" | "Q" | "H";
};

export async function qrSvg(text: string, options: QrOptions = {}): Promise<string> {
  const svg = await QRCode.toString(text, {
    type: "svg",
    errorCorrectionLevel: options.level ?? "M",
    margin: options.margin ?? 0,
    color: {
      dark: options.dark ?? "#000065",
      light: options.light ?? "#0000",
    },
  });

  /* The library emits its own width/height attributes. Stripping them lets CSS
     size the code from its container, which is what every call site wants, and
     keeps the viewBox so it stays square at any size. */
  return svg
    .replace(/\swidth="[^"]*"/, "")
    .replace(/\sheight="[^"]*"/, "")
    .replace("<svg", '<svg aria-hidden="true" focusable="false"');
}
