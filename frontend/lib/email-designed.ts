import "server-only";
import type { Email } from "@/lib/email-templates";
import { renderDesign, type Vars } from "./email-design";
import { activeDesign } from "./email-design-store";
import { kindByKey } from "./email-registry";
import { COMPANY_NAME, CONTACT_EMAIL } from "@/lib/site";

/**
 * Use the builder's design for this email when one is saved AND switched on,
 * otherwise the coded template. Any failure (no table yet, a bad design) falls
 * back to the coded one: a message must never fail to send because of the builder.
 */
export async function designed(kind: string, vars: Vars, fallback: () => Email): Promise<Email> {
  try {
    const design = await activeDesign(kind);
    const k = kindByKey(kind);
    if (!design || !k) return fallback();
    return renderDesign(design, { "studio.name": COMPANY_NAME, "studio.email": CONTACT_EMAIL, ...vars }, { unsubscribe: k.unsubscribe, why: k.why, manage: k.manage });
  } catch {
    return fallback();
  }
}
