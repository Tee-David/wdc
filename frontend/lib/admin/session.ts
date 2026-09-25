import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
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

  const { auth } = await import("@/lib/auth");
  const session = await auth.api.getSession({ headers: requestHeaders });

  return { capture, session };
});
