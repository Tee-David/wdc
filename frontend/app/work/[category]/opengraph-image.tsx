import { notFound } from "next/navigation";
import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import { WORK_CATEGORIES, countFor } from "@/lib/work";

export const alt = "Work by We Dig Creativity";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return WORK_CATEGORIES.map((c) => ({ category: c.slug }));
}

export default async function Image({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const cat = WORK_CATEGORIES.find((c) => c.slug === category);
  if (!cat) notFound();

  const n = countFor(cat);
  return ogCard({
    eyebrow: "Our Work",
    title: cat.name,
    /* Counted, so a shared card cannot promise a number the page does not show. */
    note: `${n} ${n === 1 ? "project" : "projects"}, all of them live.`,
  });
}
