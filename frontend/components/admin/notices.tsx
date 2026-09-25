"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, X } from "lucide-react";
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
  if (!notices.length) return null;
  return (
    <div className="ad__notices" role="region" aria-label="Notices">
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
