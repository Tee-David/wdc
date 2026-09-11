import type { NextConfig } from "next";

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
    optimizePackageImports: ["lucide-react", "simple-icons", "motion-icons-react"],
  },
};

export default nextConfig;
