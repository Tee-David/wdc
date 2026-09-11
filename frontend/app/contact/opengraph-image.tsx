import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const alt = "Talk to We Dig Creativity";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return ogCard({
    eyebrow: "Contact",
    title: "Tell us what you are trying to achieve",
    note: "We reply the same working day.",
  });
}
