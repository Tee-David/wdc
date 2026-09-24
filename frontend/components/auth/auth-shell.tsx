import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { AuthFrame } from "@/components/auth/auth-frame";
import { GreetingSlot } from "@/components/auth/greeting/greeting-slot";
import { OrbStage } from "@/components/auth/stage/orb-stage";
import { copy } from "@/lib/auth/copy";
import "@/app/login/login.css";

/**
 * The frame /login, /forgot-password and /reset-password share.
 *
 * LEFT, a royal blue panel that never changes with the theme: the logo, a
 * handwritten greeting, the orb, the tagline, and nothing else. RIGHT, the
 * form, on the page's own ground. On a phone the panel becomes a band above a
 * rounded sheet rather than disappearing: a bare form on a white page could
 * belong to anyone, and this is the page where somebody is about to hand over
 * a password.
 *
 * Everything on the form side is in the server HTML. The greeting and the
 * orb's shader arrive after first paint into boxes already at their final
 * size, so nothing moves when they do.
 */
export function AuthShell({ children, demo = false }: { children: React.ReactNode; demo?: boolean }) {
  return (
    <AuthFrame>
      <section className="au__brand" aria-label="We Dig Creativity">
        <div className="au__brandTop">
          <Link href="/" className="au__logo" aria-label="Back to the WDC website">
            <Logo tone="white" markClassName="au__logoMark" />
          </Link>
          <AnimatedThemeToggler className="au__theme au__theme--band" />
        </div>

        <div className="au__stage">
          <GreetingSlot />
          <OrbStage />
        </div>

        <p className="au__tagline">
          {copy.panel.tagline} <strong>{copy.panel.taglineStrong}</strong>
        </p>
      </section>

      <section className="au__panel">
        <div className="au__bar">
          <Link href="/" className="au__back au__back--bar">
            <ArrowLeft aria-hidden="true" /> {copy.common.backToSite}
          </Link>
          <div className="au__barEnd">
            {demo ? <span className="au__demo">{copy.common.demo}</span> : null}
            <AnimatedThemeToggler className="au__theme au__theme--panel" />
          </div>
        </div>

        <div className="au__column">{children}</div>

        <footer className="au__foot">
          <p className="au__new">
            {copy.common.newHere} <Link href="/contact">{copy.common.talkToUs}</Link>
          </p>
          <Link href="/" className="au__back au__back--foot">
            <ArrowLeft aria-hidden="true" /> {copy.common.backToSite}
          </Link>
          <p className="au__legal">
            By continuing you agree to our <Link href="/legal/terms-of-service">Terms of Service</Link> and{" "}
            <Link href="/legal/privacy-policy">Privacy Policy</Link>.
          </p>
        </footer>
      </section>
    </AuthFrame>
  );
}
