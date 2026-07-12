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
export const MOTTO = "Brilliant simplicity of thought";
export const CONTACT_EMAIL = "wedigcreativity@gmail.com";
