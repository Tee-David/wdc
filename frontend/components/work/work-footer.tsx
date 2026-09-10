import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/site";

/**
 * The closing band shared by all three work tiers.
 *
 * One component rather than the same block pasted into three route files:
 * this is the last thing on every work page, and three copies is three
 * chances for the contact address or the sign-off to drift.
 */
export function WorkFooter({ cta = true }: { cta?: boolean }) {
  return (
    <>
      {cta ? (
        <section className="pv pv-sec pv-sec--alt">
          <div className="pv-wrap">
            <div className="pv-head">
              <span className="pv-eyebrow">Next</span>
              <h2 className="pv-mix">
                Seen something <b>close to what you need?</b>
              </h2>
              <p className="pv-lede">
                Tell us what you are building. We will tell you plainly whether it is
                something we should be doing for you.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
                <Link className="pv-btn pv-btn--accent" href="/#pv-contact">
                  Start a conversation
                </Link>
                <Link className="pv-btn pv-btn--line" href="/services">
                  See the services
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <footer className="pv">
        <div
          className="pv-sec pv-sec--band"
          style={{ paddingBlock: "clamp(2.4rem,4vw,3.4rem)" }}
        >
          <div className="pv-wrap">
            <p style={{ color: "var(--on-band-dim)", fontSize: ".9rem", textAlign: "center" }}>
              © {new Date().getFullYear()} We Dig Creativity Solutions. All rights reserved.{" "}
              {/* Underlined, not only recoloured: a link inside body text that is
                  distinguished by colour alone is invisible to anyone who cannot
                  separate that colour from the text around it. */}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                style={{
                  color: "var(--accent)",
                  textDecoration: "underline",
                  textUnderlineOffset: "0.18em",
                }}
              >
                {CONTACT_EMAIL}
              </a>
            </p>
            <p
              style={{
                color: "var(--on-band-dim)",
                fontSize: ".9rem",
                textAlign: "center",
                marginTop: 6,
              }}
            >
              ...brilliant simplicity{" "}
              <strong style={{ color: "var(--accent)" }}>of thought!</strong>
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}

export default WorkFooter;
