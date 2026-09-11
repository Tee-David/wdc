import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import { SITE_NAME } from "@/lib/site";

/* The site-wide fallback card. Next serves it for any route that does not
   define its own, so one file covers /work, /legal, /contact and everything
   added later. */
export const alt = `${SITE_NAME} — creative and digital agency`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return ogCard({
    eyebrow: "Creative & digital agency",
    title: "Everything a brand needs, under one roof",
    note: "Branding, search, websites, apps, software and campaigns, from one team.",
  });
}
