"use client";

import { useEffect } from "react";
import { AdminState } from "@/components/admin/admin-state";

export default function AdminError({ error, reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin route failed", error);
  }, [error]);

  return (
    <section className="ad__panel">
      <AdminState
        kind="error"
        title="This page did not load"
        description="Your changes were not submitted. Try this section again, or return to the dashboard and continue elsewhere."
        action={<button className="ad__btn ad__btn--primary" onClick={reset}>Try again</button>}
        // eslint-disable-next-line @next/next/no-html-link-for-pages -- a full load, on purpose: the client router is what just failed.
        secondaryAction={<a className="ad__btn" href="/admin">Back to dashboard</a>}
      />
    </section>
  );
}
