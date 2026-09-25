import Link from "next/link";
import { ChevronRight, Lock } from "lucide-react";
import { adminRole } from "@/lib/admin/guard";
import { can, isAdminRole } from "@/lib/admin/permissions";
import { SETTINGS_GROUPS, SETTINGS_SECTIONS } from "@/lib/settings/sections";
import { SETTINGS_ICON } from "@/components/admin/settings/settings-icons";
import PageTourButton from "@/components/admin/tour/page-tour-button";

export const metadata = { title: "Settings" };

/**
 * THE SETTINGS OVERVIEW (the mockups' Settings board): every section this
 * role may open, in its group, each a row with its icon, its name, one line
 * of what is in it and a chevron. On a phone this is the whole page; on a wide
 * screen it sits beside the compact section menu. Staff see the ones they can
 * use and nothing they cannot.
 */
export default async function SettingsPage() {
  const role = await adminRole();
  const owner = can(role, "settings");
  const sections = SETTINGS_SECTIONS.filter((s) => (s.area ? can(role, s.area) : isAdminRole(role)));
  return (
    <>
      <div className="ad__head">
        <div>
          <h1>Settings</h1>
          <p>{owner
            ? "How the studio, the website and the admin run."
            : "The FAQ and the media library are yours to edit. Everything else here is the owner's."}</p>
        </div>
        <div className="ad__row"><PageTourButton /></div>
      </div>
      <div className="adSet__cards">
        {SETTINGS_GROUPS.map((g) => {
          const items = sections.filter((s) => s.group === g);
          if (!items.length) return null;
          return (
            <section key={g} className="ad__panel">
              <div className="ad__panelH"><h2>{g}</h2></div>
              {items.map((s) => {
                const Icon = SETTINGS_ICON[s.icon];
                return (
                  <Link key={s.href} href={s.href} className="adSet__row">
                    <span className="adSet__icon" aria-hidden="true"><Icon /></span>
                    <span className="adSet__text"><b>{s.label}</b><small>{s.line}</small></span>
                    <ChevronRight aria-hidden="true" className="adSet__chev" />
                  </Link>
                );
              })}
            </section>
          );
        })}
        {owner ? (
          <section className="ad__panel adSet__kept">
            <span className="adSet__icon" aria-hidden="true"><Lock /></span>
            <h2>Kept out of the dashboard on purpose</h2>
            <p>Paystack keys and the mail server&apos;s password live in the hosting environment, not here. The admin shows whether they are set, never what they are.</p>
          </section>
        ) : null}
      </div>
    </>
  );
}
