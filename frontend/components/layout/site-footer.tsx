import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { LEGAL_DOCS } from "@/lib/legal";
import { COMPANY_NAME, CONTACT_EMAIL } from "@/lib/site";
import "./site-footer.css";
import { NewTab } from "@/components/ui/new-tab";
import { Newsletter } from "./newsletter";
import { FREE_TOOLS } from "@/lib/tools";

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
 * THE SHAPE, on a desktop: a sidebar holding the studio -- wordmark, pitch and
 * the subscribe box -- beside one row of link columns. It replaced a five-column
 * grid whose tools wrapped onto a second row, which left the brand and the
 * subscribe columns standing over empty navy on either side. With the brand
 * and the box stacked in one column, every link list starts on the same line
 * and the two halves end at about the same depth.
 *
 * On a phone: the studio and the box first, Company as a row of pills, Tools
 * and More tools side by side, and the policies as small print just above the
 * copyright.
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
  { label: "Blog", href: "/blog" },
  { label: "About Us", href: "/about" },
  { label: "Contact Us", href: "/contact" },
];

/** Add real profiles here and the row appears. Nothing is guessed. */
const SOCIALS: { label: string; href: string }[] = [];


export function SiteFooter() {
  const year = new Date().getFullYear();
  /* Split at the midpoint rather than curated by hand, so a tool added to
     `lib/tools.ts` rebalances the two menus on its own. */
  const toolsHalf = Math.ceil(FREE_TOOLS.length / 2);
  const toolsA = FREE_TOOLS.slice(0, toolsHalf);
  const toolsB = FREE_TOOLS.slice(toolsHalf);

  return (
    <footer className="pv ft">
      <div className="ft__card">
        <div className="ft__cols">
          {/* the studio, and the one ask this part of the page is for */}
          <div className="ft__side">
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
              {/* TWO LENGTHS OF ONE SENTENCE. Beside the menus on a wider
                  screen a short line keeps the subscribe box level with them;
                  on a phone, where the pitch has the width to itself, the full
                  sentence spreads across it instead of sitting compact. */}
              <p className="ft__pitch">
                <span className="ft__pitchShort">
                  Brand, web, apps and campaigns, built by one creative agency.
                </span>
                {/* STRAIGHT, NOT BENT. This line used to sit on arcs echoing the
                    subscribe box; on a phone that read as a wobble rather than
                    a design, so it is plain centred text that wraps. */}
                <span className="ft__pitchLong">
                  A creative and digital agency. Branding, search, websites, apps,
                  software and campaigns, built by one team so nothing is lost in
                  the hand-off.
                </span>
              </p>
            </div>

            {/* NO HEADING. Under the pitch, the field's placeholder and the line
                beneath it already say what this is and how often it sends. */}
            <Newsletter />

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

          <div className="ft__links">
            <nav className="ft__col ft__col--nav" aria-label="Site">
              <h2>Company</h2>
              <ul>
                {NAV.map((n) => (
                  <li key={n.href}><Link href={n.href}>{n.label}</Link></li>
                ))}
              </ul>
            </nav>

            {/* "Useful links" rather than "Legal", and the address sits at the
                bottom of it. On a phone this column becomes the small print
                above the copyright; its heading is kept for screen readers. */}
            <nav className="ft__col ft__col--legal" aria-label="Useful links">
              <h2>Useful links</h2>
              <ul>
                {LEGAL_DOCS.map((d) => (
                  <li key={d.slug}>
                    <Link href={`/legal/${d.slug}`}>{d.title}</Link>
                  </li>
                ))}
                <li>
                  {/* "Email us", not the address: 27 characters set the
                      column's width and crowded the menus beside it. The
                      address is still the link, and is on /contact. */}
                  <a href={`mailto:${CONTACT_EMAIL}`} className="ft__mail">
                    Email us
                    <ArrowUpRight aria-hidden="true" />
                  </a>
                </li>
              </ul>
            </nav>

            {/* THE TOOLS, FROM THE SAME REGISTRY THE SERVICE PAGES READ, so the
                next one appears here the moment it is added to `lib/tools.ts`.
                Two menus with their own titles, so every column in the row is
                a titled menu and the gaps between them can be equal. Each hides
                itself if its half of the registry is ever empty. */}
            {FREE_TOOLS.length > 0 ? (
              <div className="ft__toolsHead" aria-hidden="true">
                <h2>Explore Our Free Tools</h2>
              </div>
            ) : null}

            {toolsA.length > 0 ? (
              <nav className="ft__col ft__col--tools" aria-label="Free tools">
                <h2>Tools</h2>
                <ul>
                  {toolsA.map((t) => (
                    <li key={t.slug}><Link href={t.href}>{t.short}</Link></li>
                  ))}
                </ul>
              </nav>
            ) : null}

            {toolsB.length > 0 ? (
              <nav className="ft__col ft__col--more" aria-label="More free tools">
                <h2>More tools</h2>
                <ul>
                  {toolsB.map((t) => (
                    <li key={t.slug}><Link href={t.href}>{t.short}</Link></li>
                  ))}
                </ul>
              </nav>
            ) : null}
          </div>
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
