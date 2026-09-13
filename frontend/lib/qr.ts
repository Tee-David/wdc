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
 *
 * ---------------------------------------------------------------------------
 * WHY THERE IS NO ANIMATED GIF HERE.
 *
 * `x-hw/amazing-qr` makes a lovely animated GIF with a picture inside the code.
 * Three things rule it out for this site, and none of them is taste:
 *
 *  1. It is Python. Running it would put a second toolchain in a build that
 *     currently needs only Node.
 *  2. Every QR on this site encodes a DIFFERENT url -- one per article, and
 *     later one per invoice. A GIF made once cannot be reused across them; it
 *     would have to be generated per page, at which point it is not a reusable
 *     asset, it is a build step per row.
 *  3. An animated GIF of a QR code is 200KB to a megabyte, against roughly 4KB
 *     for the SVG below, and a camera wants a still, high-contrast pattern --
 *     animation is the one thing that makes a code harder to read.
 *
 * What was actually being asked for -- our mark in the middle, and some life --
 * is both here: the mark is punched into the centre at error-correction level
 * H, and the life is a CSS animation on the component, which costs no bytes and
 * runs on the compositor. See components/ui/qr-code.tsx.
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
  /**
   * A path under `public/` to sit in the middle of the code -- our mark.
   *
   * Referenced by URL rather than inlined as a data URI: the file is about
   * 9KB, every page carrying a code would pay that again in its HTML, and by
   * URL the browser fetches it once and caches it across the whole site.
   */
  logo?: string;
};

/** What `qrSvg` reports back, so a caller can check its own work. */
export type QrResult = {
  svg: string;
  /** Modules per side, e.g. 45. */
  size: number;
  /** How much of the code the mark covers, as a fraction of all modules. */
  coverage: number;
};

/**
 * THE MARK COVERS THE CODE, AND THE CODE HAS TO SURVIVE IT.
 *
 * Level H recovers 30% of the codewords. The well is 11 modules across, which
 * on the 49-module codes this site's article URLs produce is 121 of 2,401 --
 * about 5%, and under 9% even on the shortest code a URL here could make.
 *
 * A contiguous block is the least favourable shape for recovery, so the margin
 * against 30% is deliberately enormous rather than merely sufficient: this is
 * the one thing here that fails silently, on somebody else's phone, weeks
 * later. 9 modules scanned just as well and was too small to read as our mark;
 * 11 was where it became recognisable.
 *
 * 13 IS WHERE IT STOPS. It was asked for larger, and 13 is the last step that
 * keeps every real code on this site under the 12% the component warns at --
 * 169 of a 49-module article code's 2,401, or 7.0%. Every blog URL was
 * rendered at 88, 104, 136 and 200px and decoded again afterwards; all passed.
 * Re-run that check before going to 15, and do not go there on a hunch.
 */
const WELL_MODULES = 13;

/**
 * The corner radius of the well, in modules.
 *
 * ROUNDED IN INK, NOT BY LEAVING MODULES OUT. The obvious way to round a hole
 * cut in a QR code is to keep the modules at its corners, and it does not
 * work: whether a corner module is dark is decided by the data, so the same
 * well would look rounded on one article and square on the next. The corners
 * are PAINTED instead -- four nubs filled in the module colour, in the region
 * the well already damaged -- so every code rounds identically.
 *
 * It costs the code nothing. The damaged area is the well either way; this
 * only changes what is drawn inside it.
 */
const WELL_RADIUS = 2.5;

export async function qrSvg(text: string, options: QrOptions = {}): Promise<string> {
  return (await qrCode(text, options)).svg;
}

export async function qrCode(text: string, options: QrOptions = {}): Promise<QrResult> {
  const dark = options.dark ?? "#000065";
  const light = options.light ?? "#0000";
  const margin = options.margin ?? 0;
  /* A mark in the middle forces H. Anything less is gambling with somebody's
     camera to save a few modules. */
  const level = options.logo ? "H" : (options.level ?? "M");

  const qr = QRCode.create(text, { errorCorrectionLevel: level });
  const size = qr.modules.size;
  const data = qr.modules.data;
  const total = size + margin * 2;

  /* The well is centred and snapped to whole modules, so its edges land on
     module boundaries rather than slicing one in half -- a half-dark module is
     what a decoder has to guess about. */
  const well = options.logo ? WELL_MODULES : 0;
  const wellStart = Math.floor((size - well) / 2);
  const wellEnd = wellStart + well;
  const inWell = (x: number, y: number) =>
    well > 0 && x >= wellStart && x < wellEnd && y >= wellStart && y < wellEnd;

  /* ONE PATH, NOT TWO THOUSAND RECTS. A 45x45 code is about a thousand dark
     modules; a thousand elements is a thousand things for the browser to lay
     out and style. Subpaths in a single `d` are one element. */
  let d = "";
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (!data[y * size + x] || inWell(x, y)) continue;
      d += `M${x + margin} ${y + margin}h1v1h-1z`;
    }
  }

  /* The four corner nubs: the well's square minus a rounded rectangle inside
     it, drawn as one compound path so `evenodd` leaves exactly the corners.
     Nothing is drawn when there is no well. */
  const wx = wellStart + margin;
  const r = Math.min(WELL_RADIUS, well / 2);
  const corners = well > 0
    /* The grid is drawn `crispEdges` on the root, which is right for squares on
       a module boundary and wrong for an arc -- without this the rounding
       comes back as a staircase. */
    ? `<path fill="${dark}" fill-rule="evenodd" shape-rendering="geometricPrecision" d="` +
      `M${wx} ${wx}h${well}v${well}h-${well}z` +
      `M${wx + r} ${wx}h${well - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}` +
      `v${well - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}` +
      `h${-(well - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}` +
      `v${-(well - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}z"/>`
    : "";

  /* THE INSET IS THE MARK'S QUIET ZONE. It keeps the logo clear of the rounded
     corners as well as of the code: a corner of radius r reaches 0.29r inward
     along the diagonal, which at these numbers is 0.73 of a module against the
     1.41 the inset buys. */
  const inset = 1;
  const logo = options.logo
    ? `<image href="${options.logo}" x="${wx + inset}" y="${wx + inset}" width="${well - inset * 2}" height="${well - inset * 2}" preserveAspectRatio="xMidYMid meet" />`
    : "";

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" ` +
    `shape-rendering="crispEdges" aria-hidden="true" focusable="false">` +
    (light === "#0000" ? "" : `<rect width="${total}" height="${total}" fill="${light}"/>`) +
    `<path fill="${dark}" d="${d}"/>` +
    corners +
    logo +
    `</svg>`;

  return { svg, size, coverage: well > 0 ? (well * well) / (size * size) : 0 };
}
