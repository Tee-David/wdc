"use server";
import { revalidatePath } from "next/cache";
import { usersOwner } from "@/lib/users/authorize";
import { paystackConfig } from "@/lib/paystack";
import { PAYSTACK_MODE_SETTING } from "@/lib/paystack-mode";
import { transaction } from "@/lib/db/transaction";
import { FAIL, OK, type ActionState } from "./validate";

export async function savePaystackSettings(_previous:ActionState,fd:FormData):Promise<ActionState> {
  const mode = fd.get("mode");
  if (mode !== "test" && mode !== "live") return FAIL({mode:"Choose Test or Live."});
  if (mode === "live" && fd.get("acknowledgeLive") !== "1") return FAIL({acknowledgeLive:"Confirm that Live accepts real payments."});
  try {
    const actor = await usersOwner("paystack-mode",true);
    if (!paystackConfig(mode).ok) return FAIL({mode:`Configure both ${mode} keys in the hosting environment first.`});
    await transaction(async c => {
      const active = await c.query(`SELECT 1 FROM "user" WHERE "id"=$1 AND "role"='owner' AND "deactivatedAt" IS NULL FOR UPDATE`,[actor.user.id]);
      if (!active.rowCount) throw new Error("Owner access ended.");
      await c.query("SELECT 1 FROM paystack_checkout_attempts LIMIT 0");
      await c.query(`INSERT INTO app_settings(key,value,saved_by,saved_at) VALUES($1,to_jsonb($2::TEXT),$3,now()) ON CONFLICT(key) DO UPDATE SET value=excluded.value,saved_by=excluded.saved_by,saved_at=now()`,[PAYSTACK_MODE_SETTING,mode,actor.user.name]);
      await c.query(`INSERT INTO user_security_events(actor_id,target_id,event,detail) VALUES($1,$1,'paystack-mode-updated',$2)`,[actor.user.id,mode]);
    });
    revalidatePath("/admin/settings/integrations");revalidatePath("/admin/settings/system");
    return OK("Payment mode updated. Existing checkouts keep their original mode.");
  } catch { return FAIL({},"Payment mode was not saved. Sign in again as owner, check the database and apply migration 0037, then retry."); }
}
