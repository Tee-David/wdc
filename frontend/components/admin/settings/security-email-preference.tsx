import { db } from "@/lib/db/pool";
import { Panel } from "../bits";
import { SecurityEmailForm } from "./security-email-form";
/** Caller supplies the authenticated person's ID, never a target from the browser. */
export async function SecurityEmailPreference({ userId }: { userId: string }) {
  let enabled = true;
  try { const row = await db.query<{ email_enabled: boolean }>(`SELECT email_enabled FROM user_security_preferences WHERE user_id=$1`, [userId]); enabled = row.rows[0]?.email_enabled ?? true; }
  catch { return <Panel title="Account-change emails"><p className="adSetPad">This preference needs migration 0036. Ask the owner to apply it in Settings › System.</p></Panel>; }
  return <Panel title="Account-change emails"><div className="adSetPad"><SecurityEmailForm enabled={enabled} /></div></Panel>;
}
