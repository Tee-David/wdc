import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import { MOTTO } from "@/lib/site";

export const alt = "About We Dig Creativity";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return ogCard({
    eyebrow: "About",
    title: MOTTO,
    note: "A creative and digital agency. Design, engineering and growth on one team.",
  });
}
