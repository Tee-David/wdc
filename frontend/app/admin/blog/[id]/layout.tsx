import { notFound } from "next/navigation";
import { postForAdmin } from "@/lib/blog-db";

/**
 * A MISSING POST IS A 404, with the status to match: asked here, outside the
 * page's loading boundary, before anything is streamed. A database that does
 * not answer is left to the page, which says so rather than "not found".
 */
export default async function PostLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === "new") return children;
  const found = await postForAdmin(id).then((p) => p ?? "missing", () => "unknown" as const);
  if (found === "missing") notFound();
  return children;
}
