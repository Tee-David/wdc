import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import { CASE_STUDIES } from "@/lib/work";

/* /work is the page a prospect is most likely to forward, and it was unfurling
   in WhatsApp and LinkedIn as a bare link. */
export const alt = "Selected work by We Dig Creativity";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return ogCard({
    eyebrow: "Selected work",
    /* Counted, not typed. A number written by hand here is a number that is
       wrong the next time a case study is added. */
    title: `${CASE_STUDIES.length} projects, all of them live`,
    note: "Branding, SEO, web, apps, software and AI, social and PPC.",
  });
}
