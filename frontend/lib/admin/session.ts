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
      session: { user: { name: "WDC Admin", email: "admin@localhost", image: null, role: "owner" } },
    };
  }

  const { auth } = await import("@/lib/auth");
  const session = await auth.api.getSession({ headers: requestHeaders });

  return { capture, session };
});
