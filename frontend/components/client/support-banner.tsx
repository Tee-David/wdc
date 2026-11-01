"use client";
import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { SUPPORT_EXIT } from "@/lib/users/support-policy";

/** One slim line while the owner views a client's portal (owner, 2026-11-01: the old card was too much on a phone). */
export default function SupportBanner({ name, expiresAt }: { name?: string; expiresAt?: string }) {
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    if (!expiresAt) return;
    const timer = setTimeout(() => { setExpired(true); window.location.reload(); }, Math.max(0, new Date(expiresAt).getTime() - Date.now()));
    return () => clearTimeout(timer);
  }, [expiresAt]);
  const live = Boolean(name) && !expired;
  return <aside className="pSupport" aria-label="Support view">
    <Eye aria-hidden="true" />
    <p>{live ? <><strong>Viewing {name}</strong><span> · read-only{expiresAt ? <> until <time dateTime={expiresAt}>{new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" }).format(new Date(expiresAt))}</time></> : null}</span></> : <strong>This view has ended</strong>}</p>
    <form action={SUPPORT_EXIT} method="post"><button className="pSupport__exit" type="submit">Exit</button></form>
  </aside>;
}
