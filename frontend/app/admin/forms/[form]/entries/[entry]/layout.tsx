import { notFound } from "next/navigation";
import { findForm } from "@/lib/forms/find";
import { getEntry } from "@/lib/forms/entries";

/**
 * A MISSING ENTRY IS A 404, with the status to match: asked here, outside the
 * page's loading boundary, before anything is streamed.
 */
export default async function EntryLayout({ children, params }: { children: React.ReactNode; params: Promise<{ form: string; entry: string }> }) {
  const { form: key, entry: id } = await params;
  const form = await findForm(key);
  const entry = form ? await getEntry(form, id).catch(() => null) : null;
  if (!entry) notFound();
  return children;
}
