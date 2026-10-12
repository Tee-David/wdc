"use client";

import { useEffect } from "react";
import { toast } from "./toast";

/**
 * SAYS "SAVED" ONCE AFTER A SERVER ACTION REDIRECTED HERE. A redirect cannot
 * carry a toast, so the destination gets `?saved=1`, raises the toast on
 * arrival and removes the parameter so a reload does not say it again.
 * Render it only when the page was reached that way.
 */
export function SavedToast({ message }: { message: string }) {
  useEffect(() => {
    toast(message);
    const url = new URL(window.location.href);
    url.searchParams.delete("saved");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [message]);
  return null;
}
