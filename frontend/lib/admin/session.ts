import "server-only";

import { cache } from "react";
import { cookies, headers } from "next/headers";
import { isAdminCapture } from "./capture";

export const getAdminRequest = cache(async () => {
  const requestHeaders = await headers();
  const capture = isAdminCapture(requestHeaders);
  if (capture) {
    return {
      capture,
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

  return { capture, session };
});
