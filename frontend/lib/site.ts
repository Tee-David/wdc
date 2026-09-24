/**
 * Canonical apex. `NEXT_PUBLIC_SITE_URL` can override this for an isolated
 * preview environment, while production and local builds use the public
 * custom domain by default.
 */
export const SITE_URL = (() => {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (env) return env;
  return "https://wedigcreativity.com.ng";
})();

export const SITE_NAME = "We Dig Creativity";
export const COMPANY_NAME = "We Dig Creativity Solutions (WDC Solutions)";

/**
 * The registered entity, for the legal pages.
 *
 * BN, NOT RC. Nigeria's Corporate Affairs Commission issues two different
 * things: an RC number to an incorporated company, and a BN number to a
 * registered BUSINESS NAME, which is what a sole proprietorship or
 * partnership gets. This was given as a business name registration, so it is
 * a BN and is cited as one. Printing "RC 8480926" in a privacy policy would
 * be asserting a different legal form than the one that exists.
 */
export const REGISTERED_NAME = "WDC Solutions Hub";
export const REGISTRATION_NO = "BN 8480926";
export const REGISTRAR = "Corporate Affairs Commission (CAC), Nigeria";
export const MOTTO = "Brilliant simplicity of thought";
export const CONTACT_EMAIL = "info@wedigcreativity.com.ng";
/** Where the studio is, as the email footer says it. */
export const LOCATION = "Lagos, Nigeria";

/**
 * The studio's own profiles, for the email footer's row of marks.
 *
 * EMPTY UNTIL THE REAL ADDRESSES ARE ADDED. Nothing in this repo says what
 * our handles are, and a guessed URL in every email we send is a link to
 * somebody else's account. The footer draws a mark only for an entry here,
 * and draws no row at all while the list is empty. Each `network` has a
 * picture in public/email/ (scripts/build-email-assets.mjs).
 */
export const SOCIAL_LINKS: { network: "x" | "linkedin" | "instagram" | "facebook" | "tiktok" | "youtube" | "behance" | "whatsapp"; label: string; url: string }[] = [];
