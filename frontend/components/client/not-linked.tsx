"use client";

import { useRouter } from "next/navigation";
import { Link2, Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { CONTACT_EMAIL } from "@/lib/site";

/**
 * A SIGNED-IN CLIENT WITH NO CLIENT RECORD (PNotLinked.dc.html). Not an
 * error: the studio has not matched this address yet. Two ways forward and
 * nothing else: email us (with the address filled in so we can find them),
 * or, if this is the wrong account, sign out and use the right one.
 */
export function NotLinked({ email }: { email: string }) {
  const router = useRouter();
  const subject = encodeURIComponent("Please link my portal account");
  const body = encodeURIComponent(`Hello, I signed in to the portal as ${email} but it says my account isn't linked yet.`);
  return (
    <section className="ad__panel pNL" aria-labelledby="nl-title">
      <span className="pNL__icon" aria-hidden="true"><Link2 /></span>
      <h1 id="nl-title">Your account isn&rsquo;t linked to a project yet</h1>
      <p>
        Nothing is missing from your side. There is simply no client record matched to this email yet.
        We&rsquo;ll connect it, usually the same working day.
      </p>
      <a className="ad__btn ad__btn--primary" href={`mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`}>
        <Mail aria-hidden="true" /> Email {CONTACT_EMAIL}
      </a>
      <p className="pNL__who">
        Signed in as <b>{email}</b> ·{" "}
        <button type="button" className="pNL__out" onClick={async () => { await authClient.signOut(); router.replace("/login"); router.refresh(); }}>
          Not you? Sign out
        </button>
      </p>
    </section>
  );
}
