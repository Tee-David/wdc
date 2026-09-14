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
          window.location.assign("/");
        }
      }}
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
