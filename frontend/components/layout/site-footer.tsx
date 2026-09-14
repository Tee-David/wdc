import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { LEGAL_DOCS } from "@/lib/legal";
import { COMPANY_NAME, CONTACT_EMAIL } from "@/lib/site";
import "./site-footer.css";
import { NewTab } from "@/components/ui/new-tab";
import { Newsletter } from "./newsletter";

/**
 * The site footer.
 *
 * WHAT IT REPLACES. The same centred copyright band was pasted into three
 * files: app/page.tsx, app/services/page.tsx and components/work/work-footer.
 * Three copies of one block is three places for the contact address or the
 * sign-off to drift, and it was already the thinnest part of the site: a line
 * of grey text at the bottom of a page that had just spent a screen and a half
 * arguing for the studio. It also had nowhere to put the legal documents.
 *
 * THE SHAPE is the one the brief asked for: a card that comes up out of the
 * page on a rounded top edge, four columns, the wordmark set enormous behind
 * them and cropped by the bottom of the card, and a closing rule. Everything
 * inside it is WDC's own type, colour and spacing.
 *
 * NO INVENTED LINKS. There is no social row, because no handles are recorded
 * anywhere in this project and a footer full of `href="#"` icons is worse than
 * no icons at all: every one is a dead end a visitor has to discover by
 * clicking. `SOCIALS` below is the slot they drop into, and the row renders
 * itself the moment it has something real to render.
 */

const NAV = [
  { label: "Home", href: "/" },
  { label: "Our Works", href: "/work" },
  { label: "Services", href: "/services" },
  { label: "About Us", href: "/about" },
  { label: "Contact Us", href: "/contact" },
];

/** Add real profiles here and the row appears. Nothing is guessed. */
const SOCIALS: { label: string; href: string }[] = [];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="pv ft">
      <div className="ft__card">
        <div className="ft__cols">
          {/* the studio */}
          <div className="ft__brand">
            {/* The project's own Logo component rather than a guessed asset
                path. `tone="auto"` is what keeps the nib orange; the other
                tones flatten the mark to a single colour. Auto reads its ink
                from `--logo-ink`, which follows the THEME -- navy on light --
                and this card is navy in both themes, so the footer overrides
                that token to white for its own subtree. */}
            <Link href="/" className="ft__logo" aria-label={`${COMPANY_NAME} home`}>
              <Logo markClassName="ft__logoMark" />
            </Link>
            <p className="ft__pitch">
              A creative and digital agency. Branding, search, websites, apps,
              software and campaigns, built by one team so nothing is lost in the
              hand-off.
            </p>
          </div>

          <nav className="ft__col" aria-label="Site">
            <h2>Company</h2>
            <ul>
              {NAV.map((n) => (
                <li key={n.href}><Link href={n.href}>{n.label}</Link></li>
              ))}
            </ul>
          </nav>

          {/* "Useful links" rather than "Legal", and the address sits at the
              bottom of it. Four policies under a heading that says Legal reads
              as the small print nobody clicks; the same four plus the way to
              reach a person reads as the column you check when you want
              something. */}
          <nav className="ft__col" aria-label="Useful links">
            <h2>Useful links</h2>
            <ul>
              {LEGAL_DOCS.map((d) => (
                <li key={d.slug}>
                  <Link href={`/legal/${d.slug}`}>{d.title}</Link>
                </li>
              ))}
              <li>
                <a href={`mailto:${CONTACT_EMAIL}`} className="ft__mail">
                  {CONTACT_EMAIL}
                  <ArrowUpRight aria-hidden="true" />
                </a>
              </li>
            </ul>
          </nav>

          <div className="ft__col ft__col--sub">
            {/* The subscribe box's own heading, now that it has a column to
                itself. The two lines that used to sit here -- where we are and
                how fast we reply -- are on /contact, which is where somebody
                deciding whether to write is already headed. */}
            <h2>Worth your inbox</h2>
            <Link className="ft__cta" href="/contact">
              Start a conversation
              <ArrowUpRight aria-hidden="true" />
            </Link>
            {SOCIALS.length ? (
              <div className="ft__social">
                {SOCIALS.map((s) => (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer">
                    {s.label}
                    <NewTab />
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          {/* IN THE GRID, NOT IN A BAND OF ITS OWN, and placed by CSS rather
              than rendered twice. It reads differently at the two sizes: on a
              desktop it belongs under Get in touch, with the other ways of
              reaching us; on a phone the columns stack and it belongs directly
              under the sentence that says what the studio is, before the three
              lists of links. Explicit grid placement does both from one
              element -- see `.ft__nl` in site-footer.css. */}
          <Newsletter />
        </div>

        {/* The wordmark, set at a share of the CARD's width rather than the
            viewport's, so it fills the same proportion of the footer at every
            size instead of swelling past it on a phone. Cropped by the card's
            bottom edge on purpose. */}
        <div className="ft__mark" aria-hidden="true">
          <span>WDC</span>
        </div>

        <div className="ft__base">
          <p>© {year} {COMPANY_NAME}. All rights reserved.</p>
          <p className="ft__motto">
            ...brilliant simplicity <b>of thought!</b>
          </p>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;
