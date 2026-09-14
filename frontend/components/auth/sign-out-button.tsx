"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useHydrated } from "@/components/auth/use-hydrated";

/**
 * Signs out and returns to the site. The only client code on /signed-in.
 *
 * DISABLED UNTIL HYDRATED, like every other control in this folder. A button
 * whose only behaviour is an onClick is inert before its JavaScript arrives,
 * and it does not look inert: pressing it in that window does nothing at all,
 * on the page whose entire purpose is to let somebody leave.
 */
export default function SignOutButton() {
  const [busy, setBusy] = useState(false);
  const hydrated = useHydrated();

  return (
    <button
      type="button"
      className="au__ghost"
      disabled={busy || !hydrated}
      onClick={async () => {
        setBusy(true);
        try {
          await authClient.signOut();
        } finally {
          /* A WHOLE NEW DOCUMENT, and the lint rule that wants `router.push()`
             here is wrong about this one case. Next keeps a client-side cache
             of RSC payloads, and those payloads were rendered for somebody who
             was signed in. A client navigation would leave that cache intact
             and paint the signed-in version of the next page at somebody who
             has just asked to be signed out. Throwing the document away is the
             only thing that throws the cache away with it.

             `finally`, so a signOut that fails still leaves. The cookie may
             survive that, but the session it names does not have to: leaving
             the page is the part the person asked for. */
          window.location.assign("/");
        }
      }}
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
