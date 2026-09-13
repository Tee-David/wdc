"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

/** Signs out and returns to the site. The only client code on /signed-in. */
export default function SignOutButton() {
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      className="au__ghost"
      disabled={busy}
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
