import type { MetadataRoute } from "next";
import { MOTTO, SITE_NAME } from "@/lib/site";

/**
 * The web app manifest.
 *
 * REAL PNG ICONS, not one SVG declared `sizes: "any"`. The reference site
 * ships only an SVG, which passes Lighthouse's installability check but leaves
 * several Android launchers to rasterise it themselves at whatever size and
 * quality they choose. A 192 and a 512 are what the spec asks for and what
 * every launcher handles predictably.
 *
 * A SEPARATE MASKABLE ICON, because the two purposes want different artwork.
 * A launcher crops a maskable icon to its own shape -- a circle, a squircle, a
 * rounded square -- and only the inner 80% is guaranteed to survive. The `any`
 * icon is drawn at 68% of the canvas; the maskable one at 52%, so the mark is
 * still whole after the crop. Declaring one file for both purposes, as the
 * reference does, means either a cropped mark or a small one.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: "WDC",
    description: MOTTO,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#030318",
    theme_color: "#000065",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/brand/icon-color.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
