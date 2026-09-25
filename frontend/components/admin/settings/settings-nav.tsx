"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, LayoutGrid } from "lucide-react";
import { can, isAdminRole, type AdminRole } from "@/lib/admin/permissions";
import { SETTINGS_GROUPS, SETTINGS_SECTIONS } from "@/lib/settings/sections";
import { SETTINGS_ICON as ICON } from "./settings-icons";


/**
 * The Settings sections (the mockups' SetNav): a compact card of links beside
 * every Settings page on a wide screen. On a phone the overview page lists
 * the sections itself, with their descriptions, and each section shows a
 * "Settings" link back instead of this.
 */
export function SettingsNav({ role }: { role: AdminRole | null }) {
  const path = usePathname();
  const sections = SETTINGS_SECTIONS.filter((s) => (s.area ? can(role, s.area) : isAdminRole(role)));
  const onIndex = path === "/admin/settings";
  return (
    <>
      {!onIndex ? (
        <Link className="adSet__back" href="/admin/settings"><ChevronLeft aria-hidden="true" /> Settings</Link>
      ) : null}
      <nav className="adSet__nav" aria-label="Settings sections">
        <p className="adSet__groupH">Settings</p>
        <ul>
          <li>
            <Link href="/admin/settings" aria-current={onIndex ? "page" : undefined}>
              <LayoutGrid aria-hidden="true" className="adSet__glyph" />
              <span className="adSet__text"><b>Overview</b></span>
            </Link>
          </li>
        </ul>
        {SETTINGS_GROUPS.map((g) => {
          const items = sections.filter((s) => s.group === g);
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
      </nav>
    </>
  );
}
