"use client";

import { useEffect } from "react";
import { AdminState } from "@/components/admin/admin-state";

export default function PortalError({ error, reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Portal route failed", error);
  }, [error]);

  return (
    <section className="ad__panel">
      <AdminState
        kind="error"
        title="This page did not load"
        description="Nothing you did caused this. Try this section again, or return to your overview and continue from there."
        action={<button className="ad__btn ad__btn--primary" onClick={reset}>Try again</button>}
        secondaryAction={<a className="ad__btn" href="/portal">Back to overview</a>}
      />
    </section>
  );
}
