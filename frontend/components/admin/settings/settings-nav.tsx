"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Search } from "lucide-react";
import { can, isAdminRole, type AdminRole } from "@/lib/admin/permissions";
import { SETTINGS_GROUPS, SETTINGS_SECTIONS, sectionMatches } from "@/lib/settings/sections";
import { SETTINGS_ICON as ICON } from "./settings-icons";


/**
 * The Settings sections (the Settings canvas): a compact menu beside every
 * Settings page on a wide screen, with a search that narrows it by name or by
 * what is inside ("vat", "paystack"). On a phone the overview page lists the
 * sections itself, and each section shows a "Settings" link back instead.
 */
export function SettingsNav({ role }: { role: AdminRole | null }) {
  const path = usePathname();
  const [q, setQ] = useState("");
  const sections = SETTINGS_SECTIONS.filter((s) => (s.area ? can(role, s.area) : isAdminRole(role)));
  const shown = sections.filter((s) => sectionMatches(s, q));
  const onIndex = path === "/admin/settings";
  return (
    <>
      <nav className="adSet__nav" aria-label="Settings sections">
        <label className="adSet__search">
          <Search aria-hidden="true" />
          <span className="ad__sr">Search settings</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search settings" />
        </label>
        {!q ? (
          <ul>
            <li>
              <Link href="/admin/settings" aria-current={onIndex ? "page" : undefined}>
                <LayoutGrid aria-hidden="true" className="adSet__glyph" />
                <span className="adSet__text"><b>Overview</b></span>
              </Link>
            </li>
          </ul>
        ) : null}
        {SETTINGS_GROUPS.map((g) => {
          const items = shown.filter((s) => s.group === g);
          if (!items.length) return null;
          return (
            <div key={g} className="adSet__group">
              <p className="adSet__groupH">{g}</p>
              <ul>
                {items.map((s) => {
                  const Icon = ICON[s.icon];
                  const on = path === s.href || path.startsWith(`${s.href}/`);
                  return (
                    <li key={s.href}>
                      <Link href={s.href} aria-current={on ? "page" : undefined}>
                        <Icon aria-hidden="true" className="adSet__glyph" />
                        <span className="adSet__text"><b>{s.label}</b></span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
        {!shown.length ? <p className="adSet__none" role="status">No setting matches &ldquo;{q}&rdquo;.</p> : null}
      </nav>
    </>
  );
}
