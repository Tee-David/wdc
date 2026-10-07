"use client";

import dynamic from "next/dynamic";
import { CONTACT_EMAIL } from "@/lib/site";
import "./onboarding.css";

/* THE FORM'S CODE DID NOT ARRIVE: a stale tab after a deploy, or a dropped
   connection. Without this the page stayed blank for good. */
function LoadFailed() {
  return (
    <div className="ob__notice" role="alert">
      <b>The form didn&rsquo;t load.</b>
      <p>Your connection may have dropped, or the site was updated while this tab was open. Anything you typed before is saved.</p>
      <button className="ob__btn ob__btn--go" type="button" onClick={() => window.location.reload()}>Reload the page</button>
    </div>
  );
}

/**
 * Mounts the form in the browser only.
 *
 * WHY NOT SERVER-RENDER IT. The form's first render restores a draft out of
 * localStorage, which does not exist on the server. Rendering it in both
 * places means either a hydration mismatch (server says empty, browser says
 * step 6) or restoring in an effect, which paints the form blank and then
 * snaps it to the saved answers a frame later. Skipping the server render
 * removes the disagreement rather than papering over it, and costs nothing
 * here: this page is behind a link, it is not indexed, and there is no
 * content on it worth delivering as HTML.
 */
const OnboardingForm = dynamic(() => import("./onboarding-form").catch(() => ({ default: LoadFailed })), {
  ssr: false,
  loading: () => <div className="ob__wait" aria-hidden="true" />,
});

export default function OnboardingMount({ closed = {}, styles = {}, engagement = false }: { closed?: Record<string, string>; styles?: Record<string, string>; engagement?: boolean }) {
  return (
    <>
      <noscript>
        <div className="ob__notice">
          <b>This form needs JavaScript.</b>
          <p>Turn it on and reload, or email {CONTACT_EMAIL} and we will take your answers on a call instead.</p>
        </div>
      </noscript>
      <OnboardingForm closed={closed} styles={styles} engagement={engagement} />
    </>
  );
}
