import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const alt = "What We Dig Creativity does";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return ogCard({
    eyebrow: "Services",
    title: "Six services, one team",
    note: "Branding, SEO, web, apps, software and AI, social and PPC.",
  });
}
