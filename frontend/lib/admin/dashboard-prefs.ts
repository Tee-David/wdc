"use server";

import { revalidatePath } from "next/cache";
import { getAdminRequest } from "./session";
import { FAIL, OK, type ActionState } from "./validate";
import { writeSetting } from "@/lib/settings/store";
import { HIDEABLE } from "./dashboard-panels";

export async function saveDashboardPanels(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { session } = await getAdminRequest();
  if (!session?.user) return FAIL({}, "Sign in again to continue.");
  const shown = new Set(fd.getAll("show").map(String));
  const hidden = HIDEABLE.map(([id]) => id).filter((id) => !shown.has(id));
  await writeSetting(`dash.hide.${session.user.id}`, hidden.join(","), session.user.name ?? "Admin");
  revalidatePath("/admin");
  return OK("Updated.");
}
