/**
 * Canonical apex. `NEXT_PUBLIC_SITE_URL` switches between the Vercel
 * preview and the live domain per environment without touching code.
 */
export const SITE_URL = (() => {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (env) return env;
  return "https://wedigcreativity.vercel.app";
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
