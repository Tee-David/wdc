"use client";
import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { SUPPORT_EXIT } from "@/lib/users/support-policy";
export default function SupportBanner({ name, expiresAt }: { name?: string; expiresAt?: string }) {
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    if (!expiresAt) return;
    const timer = setTimeout(() => { setExpired(true); window.location.reload(); }, Math.max(0, new Date(expiresAt).getTime() - Date.now()));
    return () => clearTimeout(timer);
  }, [expiresAt]);
  return <aside className="pSupport" aria-label="Support view">
    <Eye aria-hidden="true" />
    <div><strong>{name && !expired ? `Viewing ${name}'s portal` : "Support view unavailable"}</strong>
    <p>{name && !expired ? "Read-only. Changes, payments and downloads are disabled. Your owner account remains signed in." : "This view ended or could not be verified. Exit to return to your account."}</p>
    {expiresAt && !expired ? <small>Ends at <time dateTime={expiresAt}>{new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(new Date(expiresAt))} UTC</time>.</small> : null}</div>
    <form action={SUPPORT_EXIT} method="post"><button className="ad__btn ad__btn--primary" type="submit">Exit support view</button></form>
  </aside>;
}
