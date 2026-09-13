import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import AuthQuote from "@/components/auth/auth-quote";
import "@/app/login/login.css";

/** The frame /login, /forgot-password and /reset-password share. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" tabIndex={-1} className="au">
      {/* THE BRAND SIDE. On a phone this becomes a short band above the form
          rather than disappearing: a bare form on a white page could belong to
          anyone, and this is the page where a client is most entitled to know
          whose site they are handing a password to. */}
      <section className="au__brand" aria-label="We Dig Creativity">
        <div className="au__photo" aria-hidden="true" />
        <div className="au__wash" aria-hidden="true" />

        <div className="au__brandTop">
          <Link href="/" className="au__logo" aria-label="Back to the WDC website">
            <Logo tone="white" markClassName="h-11 w-auto" />
          </Link>
          {/* The switch lives here rather than in the panel because the panel
              is the form, and nothing beside a password field should compete
              with it. It is white-on-photograph either way, so it carries its
              own colour instead of the page's. */}
          <AnimatedThemeToggler className="au__theme" />
        </div>

        {/* `au__brandFoot` is what lifts this above the wash; a bare blockquote
            would be painted underneath it. */}
        <div className="au__brandFoot">
          <AuthQuote />
        </div>
      </section>

      <section className="au__panel">
        <div className="au__inner">
          <Link href="/" className="au__back">
            <ArrowLeft aria-hidden="true" /> Back to site
          </Link>
          {children}
        </div>
      </section>
    </main>
  );
}
