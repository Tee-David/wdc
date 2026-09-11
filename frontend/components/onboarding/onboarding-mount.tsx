"use client";

import dynamic from "next/dynamic";
import "./onboarding.css";

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
const OnboardingForm = dynamic(() => import("./onboarding-form"), {
  ssr: false,
  loading: () => <div className="ob__wait" aria-hidden="true" />,
});

export default function OnboardingMount() {
  return <OnboardingForm />;
}
