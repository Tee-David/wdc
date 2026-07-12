import type { MetadataRoute } from "next";
import { MOTTO, SITE_NAME } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: "WDC",
    description: MOTTO,
    start_url: "/",
    display: "standalone",
    background_color: "#030318",
    theme_color: "#000065",
    icons: [
      {
        src: "/brand/icon-color.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
