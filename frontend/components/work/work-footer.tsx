import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";

/**
 * The closing band shared by all three work tiers.
 *
 * The closing CTA, plus the shared SiteFooter. The footer used to be written
 * out here as well, and identically in app/page.tsx and app/services/page.tsx
 * -- three copies of one band, and three chances for the contact address to
 * drift. It lives in components/layout/site-footer now; this keeps only the
 * call to action, which the work pages want and the homepage does not.
 */
export function WorkFooter({ cta = true }: { cta?: boolean }) {
  return (
    <>
      {cta ? (
        <section className="pv pv-sec">
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
                <Link className="pv-btn pv-btn--accent" href="/contact">
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

      <SiteFooter />
    </>
  );
}

export default WorkFooter;
