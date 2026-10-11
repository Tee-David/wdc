import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { BarePage, StateCard } from "@/components/layout/bare-page";
import SignOutButton from "@/components/auth/sign-out-button";
import { auth } from "@/lib/auth";
import { doorFor, safeDestination } from "@/lib/roles";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Signed in",
  robots: { index: false, follow: false },
};

/**
 * THE DOOR AFTER SIGN-IN.
 *
 * Every successful sign-in lands here, and here decides where the person
 * belongs -- not the browser. The client cannot be trusted to pick its own
 * destination, and a `callbackURL` typed into a form is exactly the kind of
 * thing that gets edited.
 *
 * Most people never see this page: their role has a built home and they are
 * redirected before anything renders. It is visible only to a role whose area
 * is still being built, and it says that plainly instead of dropping them on a
 * 404 or on somebody else's dashboard.
 *
 * IT ALSO FINISHES THE INTERRUPTED JOURNEY. The middleware sends somebody who
 * asked for /admin/projects to /login?redirect=/admin/projects, and landing
 * them on /admin afterwards makes them find the page again by hand. The
 * requested path is carried through to here and run past
 * `safeDestination()` -- relative paths only, and only inside an area this
 * role is allowed into -- so an edited query string cannot turn this page into
 * an open redirect.
 */
export default async function SignedInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string | string[] }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const role = (session.user as typeof session.user & { role?: string }).role;
  const door = doorFor(role);
  if (door.ready) {
    const requested = (await searchParams).redirect;
    redirect(safeDestination(Array.isArray(requested) ? requested[0] : requested, role));
  }

  const name = session.user.name?.split(" ")[0] || session.user.email;

  return (
    <BarePage>
      <StateCard
        tone="good"
        icon="check"
        title={`You are signed in, ${name}`}
        body={`${door.label.charAt(0).toUpperCase() + door.label.slice(1)} is being built and is not open yet. Nothing is missing from your account, there is simply no page to send you to yet. Email ${CONTACT_EMAIL} and we answer the same working day.`}
      >
        <Link className="bareBtn" href="/contact">Send the studio a message</Link>
        <Link className="bareBtn is-2" href="/">Back to the website</Link>
        <SignOutButton className="bareBtn is-2" />
      </StateCard>
    </BarePage>
  );
}
