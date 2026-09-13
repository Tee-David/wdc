import { notFound } from "next/navigation";
import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import { SERVICES, SERVICE_BY_SLUG } from "@/lib/services";

export const alt = "A We Dig Creativity service";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = SERVICE_BY_SLUG.get(slug as never);
  if (!service) notFound();

  return ogCard({
    eyebrow: "Services",
    title: service.name,
    note: service.lede,
  });
}
