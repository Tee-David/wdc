import Link from "next/link";
import { can } from "@/lib/admin/permissions";
import { adminRole } from "@/lib/admin/guard";
import { getSetting } from "@/lib/admin/store";
import { persistSoon, syncStore } from "@/lib/admin/persist";
import { getAppSetting } from "@/lib/app-settings";
import { studioInbox } from "@/lib/email";
import { FORMS } from "@/lib/forms/registry";
import { NOTIFICATIONS } from "@/lib/forms/settings";
import { getFormSettings } from "@/lib/forms/settings-db";
import { FAILURE_ALERT_KEY, type FailureAlert } from "@/lib/mail-alert";
import { AdminState } from "@/components/admin/admin-state";
import { Head } from "@/components/admin/settings/kit";
import { NotificationsForm } from "@/components/admin/settings/notifications-form";

export const metadata = { title: "Notifications" };

/**
 * Every email the studio itself receives, in one place: tickets and payments
 * (lib/support-mail.ts, lib/money-mail.ts), each form's notice (the same
 * switch as that form's own Settings tab) and the failed-email alert.
 * Emails to clients are theirs to switch off, on their own settings page.
 */
export default async function NotificationsPage() {
  await syncStore();
  persistSoon();
  if (!can(await adminRole(), "settings")) {
    return <section className="ad__panel"><AdminState kind="forbidden" title="Notifications are the owner's" description="What the studio is emailed about." /></section>;
  }
  const forms = await Promise.all(
    FORMS.filter((f) => NOTIFICATIONS[f.source].some((n) => n.key === "studio-notice")).map(async (f) => {
      const s = await getFormSettings(f);
      return { key: f.key, title: f.title, on: s.notifications["studio-notice"]?.enabled !== false };
    }),
  );
  const alert = await getAppSetting<FailureAlert>(FAILURE_ALERT_KEY, null);
  return (
    <>
      <Head title="Notifications" line="What the studio is emailed about." />
      <NotificationsForm
        tickets={getSetting("notify.tickets") !== "0"} payments={getSetting("notify.payments") !== "0"}
        forms={forms} alertTo={alert?.to ?? ""} inbox={studioInbox()} />
      <p className="ad__dim adSet__foot">Change where studio emails go under <Link href="/admin/settings/email">Email</Link>.</p>
    </>
  );
}
