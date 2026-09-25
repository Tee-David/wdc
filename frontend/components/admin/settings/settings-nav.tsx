"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, History, Images, Mail, MessagesSquare, Plug, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { can, type AdminRole } from "@/lib/admin/permissions";
import { SETTINGS_GROUPS, SETTINGS_SECTIONS, type SettingsIcon } from "@/lib/settings/sections";

const ICON: Record<SettingsIcon, typeof Mail> = {
  sliders: SlidersHorizontal, messages: MessagesSquare, images: Images, mail: Mail, plug: Plug, history: History, shield: ShieldCheck,
};

/**
 * The Settings sections: a sidebar on a wide screen, and on a phone a list on
 * the Settings page itself and a "Settings" link back on every section.
 */
export function SettingsNav({ role }: { role: AdminRole | null }) {
  const path = usePathname();
  const sections = SETTINGS_SECTIONS.filter((s) => can(role, s.area));
  const onIndex = path === "/admin/settings";
  return (
    <>
      {!onIndex ? (
        <Link className="adSet__back" href="/admin/settings"><ChevronLeft aria-hidden="true" /> Settings</Link>
      ) : null}
      <nav className={`adSet__nav${onIndex ? " is-index" : ""}`} aria-label="Settings sections">
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
                        <span className="adSet__icon"><Icon aria-hidden="true" /></span>
                        <span className="adSet__text"><b>{s.label}</b><small>{s.line}</small></span>
                        <ChevronRight aria-hidden="true" className="adSet__chev" />
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
