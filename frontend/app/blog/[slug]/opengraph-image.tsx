import { notFound } from "next/navigation";
import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import { BLOG_POSTS } from "@/lib/blog";
import { postBySlugDb } from "@/lib/blog-db";

export const alt = "A post from the We Dig Creativity blog";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

/**
 * A DRAWN CARD RATHER THAN THE COVER PHOTOGRAPH.
 *
 * The covers are the site's own hero images, cropped for a 16:10 band and for
 * a card. Handed to a social network as a 1200x630 preview they are cropped
 * again, by someone else, to a ratio they were not composed for -- and the
 * post's title, which is the only thing that would make anyone click, is not
 * in the picture at all. Drawn here, every post unfurls with its own headline
 * legible at the size a timeline actually shows.
 */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await postBySlugDb(slug);
  if (!post) notFound();

  return ogCard({
    eyebrow: post.tags[0] ?? "Blog",
    title: post.title,
    /* The excerpt is a sentence; a card is not the place for one, so it is cut
       at the first clause rather than wrapped into four lines of small type. */
    note: post.excerpt.split(/\.\s|,\s/)[0],
  });
}
