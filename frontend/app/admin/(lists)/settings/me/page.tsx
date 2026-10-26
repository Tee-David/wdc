import { db } from "@/lib/db/pool";
import { getAdminRequest } from "@/lib/admin/session";
import { Head } from "@/components/admin/settings/kit";
import { PersonalNotificationPreferences } from "@/components/workspace/personal-preferences";
import { WorkingWeek } from "@/components/workspace/working-week";

export const metadata = { title: "Notifications and week" };

/**
 * YOUR OWN NOTIFICATIONS AND WORKING WEEK, for everyone with an admin role
 * (the S-Settings board's Notifications and Working week). The studio-wide
 * notification settings stay owner-only in Notifications.
 */
export default async function MySettings() {
  const { session } = await getAdminRequest();
  const me = session?.user?.id ?? "";
  const days = me ? await db.query<{ work_days: string }>("SELECT work_days FROM workspace_notification_preferences WHERE user_id=$1", [me]).then((r) => r.rows[0]?.work_days ?? "1,2,3,4,5", () => null) : null;
  return (
    <>
      <Head title="Notifications and week" line="What reaches you by email, and the days you work." />
      <PersonalNotificationPreferences />
      <WorkingWeek days={days} />
    </>
  );
}
