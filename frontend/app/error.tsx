"use client";

import { BarePage, StateCard } from "@/components/layout/bare-page";
import { CONTACT_EMAIL } from "@/lib/site";

/**
 * ANY PUBLIC PAGE THAT FAILS TO RENDER (a database timeout, a malformed
 * record). Without this, Next shows its own unstyled "Application error" with
 * no navigation and no way to try again. Said the way the board says it: what
 * failed, that nothing was lost, the reference to quote, and the two ways
 * forward: try again, or tell the studio (an email with the reference in it).
 */
export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const reference = error.digest ? `ERR-${error.digest.toUpperCase()}` : "";
  const subject = encodeURIComponent(`Something went wrong${reference ? ` (${reference})` : ""}`);
  return (
    <BarePage>
      <StateCard
        tone="bad"
        icon="alert"
        title="Something went wrong on our side"
        body="It is not you, and nothing you typed elsewhere is lost. Try again, and if it repeats, quote the reference below."
      >
        {reference ? (
          <dl className="bareDl">
            <div><dt>Reference</dt><dd className="num">{reference}</dd></div>
          </dl>
        ) : null}
        <button type="button" className="bareBtn" onClick={() => reset()}>Try again</button>
        <a className="bareBtn is-2" href={`mailto:${CONTACT_EMAIL}?subject=${subject}`}>Tell the studio</a>
      </StateCard>
    </BarePage>
  );
}
