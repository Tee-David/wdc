import "server-only";

import { studioInbox } from "@/lib/email";
import { hydrateSettings } from "@/lib/settings/store";
import { SITE_URL } from "@/lib/site";
import { staffOnboardedEmail } from "@/lib/email-templates";
import { getSetting } from "@/lib/admin/store";
import { sendLogged } from "@/lib/outbox";
import { logNotSent } from "@/lib/lifecycle-mail";

/**
 * THE OWNER HEARS WHEN A NEW STAFF MEMBER IS ON BOARD: they finished the
 * welcome, or skipped it. Behind the response, through the outbox, keyed to
 * the person so pressing it twice (or a retry) mails once. Switchable under
 * Settings, Notifications (notify.staff).
 *
 * ONE PERSON, AT MOST TWO NOTES. The owner is told when they ACCEPT the
 * invitation (lib/lifecycle-mail.ts sendStaffJoined); this one follows only if
 * they FINISH the welcome. Skipping it says nothing new, so it is logged as
 * not sent rather than mailed again.
 */
export async function sendStaffOnboarded(input: { userId: string; name: string; email: string; skipped: boolean }) {
  await hydrateSettings();
  if (getSetting("notify.staff") === "0") return;
  if (input.skipped) {
    await logNotSent({ why: "the owner was told when they accepted, and they skipped the welcome.", subject: `${input.name} is on board`, dedupeKey: `staff-onboarded:${input.userId}`, by: "Website", to: studioInbox() });
    return;
  }
  try {
    await sendLogged(
      { to: studioInbox(), ...staffOnboardedEmail({ name: input.name, email: input.email, skipped: input.skipped, url: new URL("/admin/users", SITE_URL).toString() }) },
      { summary: input.skipped ? "A new staff member skipped the welcome." : "A new staff member finished the welcome.", dedupeKey: `staff-onboarded:${input.userId}`, by: "Website" },
    );
  } catch { /* The row records the failure. */ }
}
