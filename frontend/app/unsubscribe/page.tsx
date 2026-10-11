import type { Metadata } from "next";
import Link from "next/link";
import { BarePage, StateCard } from "@/components/layout/bare-page";
import { unsubscribeTokenValid } from "@/lib/newsletter";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

/* Every visit is its own link, checked on the server. */
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/**
 * Leaving the newsletter, from the link in an email.
 *
 * A BUTTON, NOT A VISIT. Opening the link only asks; pressing the button
 * unsubscribes, because link scanners and inbox previews open every link and
 * must not take people off the list. Mail clients that support one-click
 * unsubscribe skip this page entirely (see the API route).
 */
export default async function UnsubscribePage({ searchParams }: Props) {
  const sp = await searchParams;
  const email = one(sp.e);
  const token = one(sp.t);
  const valid = email && token ? unsubscribeTokenValid(email, token) : false;
  const done = one(sp.done) === "1";
  const failed = one(sp.bad) === "1" || one(sp.error) === "1";

  const heading = done ? "You are off the list" : valid ? "Leave the newsletter?" : "This link does not work";
  const lede = done
    ? "Nothing else will arrive. If you change your mind, the sign-up box is at the bottom of every page."
    : valid
      ? `${email} stops getting the studio newsletter. Invoices, receipts and project emails are not part of it and keep coming.`
      : failed
        ? "Something went wrong taking you off the list. Please try the link again in a minute."
        : `The link may be incomplete. Reply to any of our emails, or write to ${CONTACT_EMAIL}, and we will take you off by hand.`;

  return (
    <BarePage>
      <StateCard
        tone={done ? "good" : valid ? "neutral" : "warn"}
        icon={done ? "check" : valid ? "mail" : "alert"}
        title={heading}
        body={lede}
      >
        {valid && !done ? (
          <>
            <form method="post" action="/api/newsletter/unsubscribe" className="bareForm">
              <input type="hidden" name="e" value={email} />
              <input type="hidden" name="t" value={token} />
              <button className="bareBtn" type="submit">Unsubscribe</button>
            </form>
            <Link className="bareBtn is-2" href="/">Stay subscribed</Link>
          </>
        ) : (
          <Link className="bareBtn" href="/">Back to the site</Link>
        )}
      </StateCard>
    </BarePage>
  );
}
