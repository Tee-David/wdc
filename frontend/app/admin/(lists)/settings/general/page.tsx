import { adminRole } from "@/lib/admin/guard";
import { AdminState } from "@/components/admin/admin-state";
import { financeSettings } from "@/lib/admin/store";
import { REMINDER_DAYS } from "@/lib/settings/registry";
import { Head } from "@/components/admin/settings/kit";
import { StudioForm } from "@/components/admin/settings/studio-form";
import PageTourButton from "@/components/admin/tour/page-tour-button";
import { persistSoon, syncStore } from "@/lib/admin/persist";

export const metadata = { title: "Studio and invoices" };

/**
 * How a new invoice starts and when unpaid ones are chased. Every control
 * here has a reader: the invoice and estimate builders take the VAT and the
 * terms, and the daily job sends the reminders (lib/jobs/reminders.ts).
 * Values are rows in `app_settings` merged over what shipped, so setting one
 * back to what shipped removes the row.
 */
export default async function StudioSettingsPage() {
  await syncStore();
  persistSoon();
  if ((await adminRole()) !== "owner") {
    return (
      <section className="ad__panel">
        <AdminState kind="forbidden" title="Studio settings are for the owner"
          description="The FAQ and the media library are yours to edit, from the list of sections." />
      </section>
    );
  }
  const f = financeSettings();
  return (
    <>
      <Head title="Studio and invoices" line="How new invoices start, and when unpaid ones are chased."><PageTourButton /></Head>
      <div data-tour="settings-table">
        <StudioForm vatRate={f.vatRate} vatOn={f.vatOn} dueInDays={f.dueInDays} reminders={f.reminders} days={REMINDER_DAYS} />
      </div>
    </>
  );
}
