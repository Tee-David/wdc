import { notFound } from "next/navigation";
import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import { LEGAL_DOCS } from "@/lib/legal";

export const alt = "We Dig Creativity policy";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/* One image per policy, generated at build time from the same data the page
   renders, so a retitled document cannot end up with a card naming the old
   one. */
export function generateStaticParams() {
  return LEGAL_DOCS.map((doc) => ({ slug: doc.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = LEGAL_DOCS.find((d) => d.slug === slug);
  if (!doc) notFound();

  return ogCard({
    eyebrow: "Policy",
    title: doc.title,
    /* The blurb is a sentence; a card is not the place for one, so it is cut
       at the first clause rather than wrapped into four lines of small type. */
    note: doc.blurb.split(/,\s|\.\s/)[0],
  });
}
