import "server-only";

import { cache } from "react";
import { cookies, headers } from "next/headers";
import { isAdminCapture } from "./capture";
import { clientSupportCookiePresent, resolveStaffSupportView, staffSupportCookiePresent, supportCookiePresent } from "@/lib/users/support";

/** Present only during the owner's read-only view as a staff member. */
export type AdminSupport = { actorId: string; actorName: string; expiresAt: string; minutes: number };

export const getAdminRequest = cache(async () => {
  const requestHeaders = await headers();
  const capture = isAdminCapture(requestHeaders);
  if (capture && !(await supportCookiePresent())) {
    return {
      capture,
      support: null as AdminSupport | null,
      supportUnavailable: false,
      /* Capture can stand in for staff too (same token, never in
         production -- see isAdminCapture), so a spec can prove what staff
         are shown and refused without a second real account. */
      session: requestHeaders.get("x-boneyard-capture-role") === "staff"
        ? { user: { id: "capture-staff", name: "WDC Staff", email: "staff@localhost", image: null, role: "staff" } }
        : { user: { id: "capture-owner", name: "WDC Admin", email: "admin@localhost", image: null, role: "owner" } },
    };
  }

  /* THE COOKIE STORE, NOT THE REQUEST'S COOKIE HEADER. A server action that
     replaces the session (a password change) sets a new cookie, and Next
     re-renders the page in the same request; the raw header still carries
     the token that was just revoked, so the re-render would sign them out. */
  const h = new Headers(requestHeaders);
  const jar = (await cookies()).toString();
  if (jar) h.set("cookie", jar); else h.delete("cookie");
  const { auth } = await import("@/lib/auth");
  const session = await auth.api.getSession({ headers: h });

  /* A SUPPORT COOKIE CHANGES WHO THIS REQUEST IS, OR IT ENDS THE REQUEST.
     Staff view: the signed-in owner (still the only authenticator) is shown as
     the TARGET staff member, role "staff", so adminRole(), can(), "my work"
     and every per-person query read exactly what that person would see. The
     marker `support` is what the shell draws the bar from. Anything else with
     a support cookie -- a client view, both cookies, a view that expired, was
     revoked, lost its owner session or whose target was deactivated -- is NO
     session at all (fail closed), and the layout shows the Exit screen
     instead of redirecting, because a redirect to /login from a signed-in
     owner would bounce straight back. */
  const staff = await staffSupportCookiePresent();
  if (staff || (await clientSupportCookiePresent())) {
    const view = staff && !(await clientSupportCookiePresent()) && session
      ? await resolveStaffSupportView(session).catch(() => null) : null;
    if (!view || !session) return { capture, support: null as AdminSupport | null, supportUnavailable: true, session: null };
    return {
      capture,
      support: { actorId: view.actorId, actorName: view.actorName, expiresAt: view.expiresAt, minutes: Math.max(0, Math.ceil((new Date(view.expiresAt).getTime() - Date.now()) / 60_000)) } as AdminSupport | null,
      supportUnavailable: false,
      session: { ...session, user: { ...session.user, id: view.targetId, name: view.name, email: view.email, image: null, role: "staff" } },
    };
  }

  return { capture, support: null as AdminSupport | null, supportUnavailable: false, session };
});
