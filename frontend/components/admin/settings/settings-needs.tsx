import Link from "next/link";
import { ChevronRight, DatabaseZap, EyeOff, MailWarning, ServerCrash, Wrench, type LucideIcon } from "lucide-react";

export type SettingsNeed = { href: string; title: string; line: string; tone: "live" | "warn" | "bad"; icon: "database" | "mail" | "hidden" | "maintenance" | "service" };

const ICON: Record<SettingsNeed["icon"], LucideIcon> = { database: DatabaseZap, mail: MailWarning, hidden: EyeOff, maintenance: Wrench, service: ServerCrash };

/**
 * "NEEDS YOU" AT THE TOP OF SETTINGS: what is set wrong or waiting, each row
 * opening the section that fixes it. Built from stored state by the page;
 * nothing to show means no card.
 */
export function SettingsNeeds({ items }: { items: SettingsNeed[] }) {
  if (!items.length) return null;
  return (
    <section className="ad__panel adSet__needs" aria-label="Settings that need you">
      <div className="ad__panelH"><h2>Needs you</h2><span className="adSet__needsN">{items.length}</span></div>
      {items.map((n) => {
        const Icon = ICON[n.icon];
        return (
          <Link key={n.href + n.title} href={n.href} className="adSet__row">
            <span className={`adSet__icon adSet__icon--${n.tone}`} aria-hidden="true"><Icon /></span>
            <span className="adSet__text"><b>{n.title}</b><small>{n.line}</small></span>
            <span className="adSet__end"><ChevronRight aria-hidden="true" className="adSet__chev" /></span>
          </Link>
        );
      })}
    </section>
  );
}
