import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const alt = "We Dig Creativity policies";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return ogCard({
    eyebrow: "Policies",
    title: "How we handle your information",
    note: "Privacy, terms, cookies and client engagement, in plain English.",
  });
}
