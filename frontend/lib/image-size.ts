import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * The real pixel size of a file in `public/`.
 *
 * WHY THIS EXISTS. `next/image` needs either `fill` -- which absolutely
 * positions the picture and so contributes NO height -- or a width and a
 * height. The brand-guide galleries wanted neither: their pages are portrait,
 * landscape and square in the same row, so a fixed aspect ratio crops them and
 * `fill` inside an `aspect-ratio: auto` box collapses to nothing. That is not
 * hypothetical: it is what had happened. Measured on the live build, every
 * branding case study was rendering five gallery images at TWO PIXELS tall,
 * which is why nobody had noticed they were missing.
 *
 * Reading the real dimensions gives each figure its own aspect ratio, so the
 * artwork sets its own shape and the space is reserved before it loads.
 *
 * IT COSTS NOTHING AT RUNTIME. Every page that calls this is statically
 * generated, so the read happens once at build time and the result is baked
 * into the HTML.
 *
 * HEADER PARSING RATHER THAN A LIBRARY. A JPEG's size is in its SOF marker and
 * a PNG's is in the first 24 bytes of its IHDR chunk. That is a dozen lines
 * against a dependency, and this reads only the first 64KB of the file rather
 * than decoding it.
 */
export type Size = { width: number; height: number };

/* A sane shape for anything unreadable, so a missing file degrades to a
   correctly-sized box rather than to a collapsed one. */
const FALLBACK: Size = { width: 3, height: 2 };

export async function publicImageSize(src: string): Promise<Size> {
  try {
    const file = path.join(process.cwd(), "public", src.replace(/^\//, ""));
    /* 64KB is far past any JPEG's SOF marker in practice and the whole of a
       PNG header; reading the rest would be work thrown away. */
    const buf = await readFile(file);
    return sizeOf(buf.subarray(0, 65536)) ?? FALLBACK;
  } catch {
    return FALLBACK;
  }
}

/**
 * The same parser, for bytes that never came from disk.
 *
 * ADDED FOR THE LINK PREVIEW CHECKER, which has to say whether somebody's
 * og:image is the shape WhatsApp and LinkedIn want. That answer needs the real
 * pixel size of a file on a stranger's server, and the alternative to reusing
 * this was a second copy of the same header walking in another module.
 *
 * It takes the first bytes of the file, not the file: the caller stops reading
 * once it has enough, so a 4MB hero image costs us a few kilobytes.
 */
export function imageSizeFromBytes(bytes: Uint8Array): Size | null {
  return sizeOf(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength));
}

function sizeOf(b: Buffer): Size | null {
  /* PNG: 8-byte signature, then the IHDR chunk with width and height as
     big-endian 32-bit integers at offsets 16 and 20. */
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) {
    return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  }

  /* JPEG: walk the markers to the start-of-frame, which carries the size.
     SOF0 through SOF15 all do, EXCEPT the four that are not frame headers --
     DHT (C4), JPG (C8) and DAC (CC) -- which is why they are excluded rather
     than the range being taken whole. */
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length - 9) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
      }
      /* Skip this segment by its own declared length. */
      const len = b.readUInt16BE(i + 2);
      if (len < 2) return null;
      i += 2 + len;
    }
  }

  /* GIF: "GIF8", then the logical screen width and height as little-endian
     16-bit integers. Two lines, and it is what an animated social image
     usually is. */
  if (b.length > 10 && b.toString("ascii", 0, 4) === "GIF8") {
    return { width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
  }

  /* WEBP, WHICH IS WHY THIS FUNCTION GREW. Every image optimiser now emits it,
     including our own `next/image`, so a checker that could not read one would
     report "we could not measure that" on a large share of modern sites -- the
     ones that have done the work, which is the wrong half to fail on.
     It is a RIFF container with three shapes inside it, and they disagree
     about where the size lives:
       VP8   lossy:    two 14-bit values after the start code, at 26 and 28
       VP8L  lossless: 14 bits each, packed across four bytes from 21
       VP8X  extended: two 24-bit values from 24, stored one less than actual */
  if (b.length > 30 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") {
    const chunk = b.toString("ascii", 12, 16);
    if (chunk === "VP8 " && b.length > 30) {
      return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
    }
    if (chunk === "VP8L" && b.length > 25) {
      const bits = b.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (chunk === "VP8X" && b.length > 30) {
      return {
        width: (b[24] | (b[25] << 8) | (b[26] << 16)) + 1,
        height: (b[27] | (b[28] << 8) | (b[29] << 16)) + 1,
      };
    }
  }

  return null;
}
