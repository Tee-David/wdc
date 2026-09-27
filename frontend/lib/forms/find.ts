import "server-only";

import { cache } from "react";
import { formByKey, type FormDef } from "./registry";
import { getCustomForm, toFormDef } from "./custom";

/** A form by its key: one of the site's own, or one built in the admin.
 *  Once per request: the form's layout and its page both ask. */
export const findForm = cache(async (key: string): Promise<FormDef | undefined> => {
  const own = formByKey(key);
  if (own) return own;
  const built = await getCustomForm(key).catch(() => null);
  return built ? toFormDef(built) : undefined;
});
