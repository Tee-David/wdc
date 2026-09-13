import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import SignOutButton from "@/components/auth/sign-out-button";
import { auth } from "@/lib/auth";
import { doorFor } from "@/lib/roles";
import "../login/login.css";

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
 */
export default async function SignedInPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const role = (session.user as typeof session.user & { role?: string }).role;
  const door = doorFor(role);
  if (door.ready) redirect(door.home);

  const name = session.user.name?.split(" ")[0] || session.user.email;

  return (
    <main id="main" tabIndex={-1} className="au au--solo">
      <section className="au__panel">
        <div className="au__inner">
          <Link href="/" className="au__soloLogo" aria-label="We Dig Creativity">
            <Logo markClassName="h-10 w-auto" />
          </Link>

          <div className="au__formWrap">
            <h1>You are signed in, {name}.</h1>
            <p className="au__lede">
              {door.label.charAt(0).toUpperCase() + door.label.slice(1)} is being
              built and is not open yet. Nothing is missing from your account --
              there is simply no page to send you to.
            </p>

            <div className="au__notice">
              <b>What you can do now</b>
              <span>
                Email us at hello@wedigcreativity.com.ng and we will answer the
                same working day. If you are mid-project, your WDC contact has
                everything you need in the meantime.
              </span>
              <Link href="/contact">Send us a message</Link>
            </div>

            <div className="au__soloActions">
              <Link className="au__ghost" href="/">Back to the website</Link>
              <SignOutButton />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
