import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import { BLOG_POSTS } from "@/lib/blog";

export const alt = "The We Dig Creativity blog";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return ogCard({
    eyebrow: "Blog",
    title: "What we have learned, written down",
    /* Counted, so the card cannot claim a number the index does not show. */
    note: `${BLOG_POSTS.length} pieces on branding, search, building and growth.`,
  });
}
