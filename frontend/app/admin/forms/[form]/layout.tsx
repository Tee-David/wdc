import { notFound, redirect } from "next/navigation";
import { findForm } from "@/lib/forms/find";
import { isEntryId, onboardingServiceOf } from "@/lib/forms/entries";
import { syncStore } from "@/lib/admin/persist";
import { getSubmission } from "@/lib/admin/store";

/**
 * A FORM THAT DOES NOT EXIST IS A 404, with the status to match. The page
 * streams behind its loading skeleton (loading.tsx), and a notFound() or
 * redirect() thrown once streaming has begun arrives on a 200. The layout sits
 * outside that boundary, so asking here answers before anything is sent.
 *
 * An old link to one brief (`/admin/forms/<its id>`, from before each form had
 * its own page) is sent on to the entry. A short id is one of the demo
 * submissions, which the page draws; anything else is a 404.
 */
export default async function FormLayout({ children, params }: { children: React.ReactNode; params: Promise<{ form: string }> }) {
  const { form: key } = await params;
  if (await findForm(key)) return children;
  if (isEntryId(key)) {
    const service = await onboardingServiceOf(key).catch(() => null);
    if (service) redirect(`/admin/forms/onboarding-${service}/entries/${key}`);
    notFound();
  }
  await syncStore();
  if (!getSubmission(key)) notFound();
  return children;
}
