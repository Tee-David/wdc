import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import "@/components/admin/admin.css";
import "@/components/layout/bare.css";

/**
 * THE FRAME OF A BARE PAGE: public documents, booking, forms and the system
 * states. A top bar with the studio's mark and the theme switch, one centred
 * column, a small footer. The board's `bare` shell, so these pages read as one
 * family with the sign in page and with the dashboards they lead to.
 *
 * Server component. The only client piece is the theme toggle.
 */
export function BarePage({ children, label = "WDC Studio" }: { children: React.ReactNode; label?: string }) {
  return (
    <div className="bare">
      <header className="bareTop">
        <Link href="/" className="bareBrand" aria-label={`${label}, home`}>
          <Logo markClassName="bareMark" className="bareLogo" />
        </Link>
        <span className="bareGrow" />
        <AnimatedThemeToggler className="bareTheme" />
      </header>
      <main id="main" tabIndex={-1} className="bareMain">
        {children}
      </main>
      <footer className="bareFoot">
        <span>{label}</span>
        <Link href="/policies/privacy-policy">Privacy</Link>
        <Link href="/policies/terms-of-service">Terms</Link>
        <Link href="/contact">Help</Link>
      </footer>
    </div>
  );
}

export type StateTone = "neutral" | "bad" | "warn" | "good" | "brand";

const PATHS = {
  search: "M21 21l-4.3-4.3M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z",
  alert: "M12 8v5M12 17h.01",
  mail: "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6",
  check: "M5 12l5 5L20 7",
  offline: "M2 8.8a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 20h.01M3 3l18 18",
  shield: "M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z",
  link: "M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1 1M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1-1",
  lock: "M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z",
  calendar: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  x: "M18 6 6 18M6 6l12 12",
} as const;
export type StateIcon = keyof typeof PATHS;

/**
 * ONE CARD FOR EVERY "SOMETHING TO KNOW" SCREEN: a solid icon tile, a title
 * that is the situation, a sentence that says what happens next, then up to
 * two actions stacked full width. `children` is the actions (and anything
 * between: a reference, a field).
 */
export function StateCard({
  tone = "neutral",
  icon,
  big,
  title,
  children,
  body,
  live = true,
}: {
  tone?: StateTone;
  icon: StateIcon;
  big?: string;
  title: string;
  body?: React.ReactNode;
  children?: React.ReactNode;
  live?: boolean;
}) {
  return (
    <div className="bareCard bareState" aria-live={live ? "polite" : undefined}>
      <div className="bareStateHead">
        {big ? <span className="bigNum" aria-hidden="true">{big}</span> : null}
        <span className={`tickBig is-${tone}`}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d={PATHS[icon]} /></svg>
        </span>
        <div>
          <h1>{title}</h1>
          {body ? <p className="sub">{body}</p> : null}
        </div>
      </div>
      {children}
    </div>
  );
}
