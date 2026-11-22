/**
 * Canonical apex. `NEXT_PUBLIC_SITE_URL` can override this for an isolated
 * preview environment, while production and local builds use the public
 * custom domain by default.
 */
export const SITE_URL = (() => {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (env) return env;
  return "https://wedigcreativity.com";
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
export const CONTACT_EMAIL = "info@wedigcreativity.com";
/** Where the studio is, as the email footer says it. The country, never a
 *  city (AGENTS.md: the studio is meant to outgrow one). */
export const LOCATION = "Nigeria";

/** The studio's phone, which is also its WhatsApp line (owner, 2026-11-15). */
export const PHONE_DISPLAY = "+234 708 704 1261";
export const PHONE_TEL = "+2347087041261";
export const WHATSAPP_URL = "https://wa.me/2347087041261";

/**
 * The studio's street address, for the email footer's "Visit" line. The owner
 * gave the street on 2026-11-15; the number comes later. While STREET_NO is
 * empty the address renders without one.
 */
export const STREET_NO = "";
export const STREET = "Oseni Street, Lawanson, Lagos";
export const STUDIO_ADDRESS = STREET_NO ? `${STREET_NO} ${STREET}` : STREET;

/**
 * The studio's own profiles, for the email footer's row of marks (owner,
 * 2026-11-15). Settings > Business profile can override each one. The footer
 * draws a mark only for an entry here or a saved setting. Each `network` has a
 * picture in public/email/ (scripts/build-email-assets.mjs).
 */
export const SOCIAL_LINKS: { network: "x" | "linkedin" | "instagram" | "facebook" | "tiktok" | "youtube" | "behance" | "whatsapp"; label: string; url: string }[] = [
  { network: "facebook", label: "Facebook", url: "https://facebook.com/wedigcreativity" },
  { network: "instagram", label: "Instagram", url: "https://instagram.com/wedigcreativity" },
  { network: "x", label: "X", url: "https://x.com/wedigcreativity" },
];
