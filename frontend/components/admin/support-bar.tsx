"use client";
import { useEffect } from "react";
import { UserRoundCog } from "lucide-react";
import { SUPPORT_EXIT } from "@/lib/users/support-policy";
import { toast } from "./toast";

/** Ends the staff view the way the bar's own button does: a real POST form, so it works with scripts still loading. */
export function exitSupportView() {
  const form = document.createElement("form");
  form.method = "post";
  form.action = SUPPORT_EXIT;
  form.setAttribute("data-support-exit", "");
  document.body.append(form);
  form.submit();
}

/**
 * The bar across the top of EVERY admin page while the owner works as a staff
 * member. Not timed and not read-only: changes save as the staff member and
 * the audit log names the owner as well ("Owner (as Staff)"). Solid fill
 * (--ad-fill with --ad-on-fill, 4.5:1 or better in both themes), and the Exit
 * button inverts the pair so it keeps its edge.
 */
export default function SupportBar({ name, actorName }: { name?: string; actorName?: string }) {
  const live = Boolean(name);
  useEffect(() => {
    /* The proxy sends a page the staff view cannot open back to the dashboard with this flag; say why, once. */
    if (!live) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("notice") !== "support-read-only") return;
    toast("That page is not open to staff, so it is not open in this view.", "bad");
    url.searchParams.delete("notice");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }, [live]);
  return (
    <aside className="adSupport" aria-label="Working as staff">
      <UserRoundCog aria-hidden="true" />
      <div className="adSupport__text">
        {live ? <>
          <strong>Working as {name} (staff).</strong>
          <span>Changes save as {name}, and the audit log records them as {actorName ? `${actorName} (as ${name})` : `you (as ${name})`}.</span>
        </> : <>
          <strong>Staff view ended</strong>
          <span>This view ended or could not be verified. Exit to return to your own account.</span>
        </>}
      </div>
      <form action={SUPPORT_EXIT} method="post" data-support-exit="">
        <button className="adSupport__exit" type="submit">Back to my account</button>
      </form>
    </aside>
  );
}
