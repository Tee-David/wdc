"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { SETTINGS_GROUPS, sectionMatches, type SettingsSection } from "@/lib/settings/sections";
import { SETTINGS_ICON } from "./settings-icons";

/** The overview's list of sections, with the same search as the menu. On a
    phone this is the whole of Settings. */
export function SettingsOverview({ sections, values }: { sections: SettingsSection[]; values: Record<string, string> }) {
  const [q, setQ] = useState("");
  const shown = sections.filter((s) => sectionMatches(s, q));
  return (
    <>
      <label className="adSet__search adSet__search--page">
        <Search aria-hidden="true" />
        <span className="ad__sr">Search settings</span>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search settings" />
      </label>
      <div className="adSet__cards">
        {SETTINGS_GROUPS.map((g) => {
          const items = shown.filter((s) => s.group === g);
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
                    <span className="adSet__end">
                      {values[s.href] ? <span className="adSet__val">{values[s.href]}</span> : null}
                      <ChevronRight aria-hidden="true" className="adSet__chev" />
                    </span>
                  </Link>
                );
              })}
            </section>
          );
        })}
      </div>
      {!shown.length ? <p className="adSet__none" role="status">No setting matches &ldquo;{q}&rdquo;.</p> : null}
    </>
  );
}
