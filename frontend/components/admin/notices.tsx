"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronDown, X } from "lucide-react";
import type { AdminNotice } from "@/lib/admin/notices";

const COOKIE = "wdc.notices";

/** Remember a dismissal for this browser, keeping the last twenty keys. */
function dismiss(key: string) {
  const now = document.cookie.split("; ").find((c) => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1) ?? "";
  const keys = [...decodeURIComponent(now).split("|").filter((k) => k && k !== key), key].slice(-20);
  document.cookie = `${COOKIE}=${encodeURIComponent(keys.join("|"))}; path=/admin; max-age=${60 * 60 * 24 * 180}; samesite=lax`;
}

/** The standing conditions, above the page. Solid tone fills, with a dismiss. */
export default function AdminNotices({ notices }: { notices: AdminNotice[] }) {
  const router = useRouter();
  /* On a phone, two or more banners took the first screen. They fold into
     one bar that says how many, the worst tone first, and opens on a tap. */
  const [open, setOpen] = useState(false);
  if (!notices.length) return null;
  const worst = notices.some((n) => n.tone === "bad") ? "bad" : notices[0].tone;
  return (
    <div className={`ad__notices${notices.length > 1 ? " is-many" : ""}${open ? " is-open" : ""}`} role="region" aria-label="Notices">
      {notices.length > 1 ? (
        <button type="button" className={`ad__banner ad__banner--${worst} ad__noticesSum`} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <AlertTriangle aria-hidden="true" />
          <p><b>{notices.length} things need you.</b> {notices[0].title}{notices.length > 2 ? ` and ${notices.length - 1} more` : `, and ${notices[1].title.charAt(0).toLowerCase()}${notices[1].title.slice(1)}`}.</p>
          <ChevronDown className="ad__noticesChev" aria-hidden="true" />
        </button>
      ) : null}
      {notices.map((n) => (
        <div key={n.key} className={`ad__banner ad__banner--${n.tone}`}>
          <AlertTriangle aria-hidden="true" />
          <p><b>{n.title}.</b> {n.body} {n.href ? <Link href={n.href}>{n.link ?? "Open"}</Link> : null}</p>
          <button type="button" className="ad__bannerX" aria-label={`Dismiss: ${n.title}`}
            onClick={() => { dismiss(n.key); router.refresh(); }}>
            <X aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
