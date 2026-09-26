/**
 * ADDRESSES WE DO NOT TAKE: throwaway inboxes, and the privacy mail services
 * the owner asked to refuse (2026-09-26). A brief, an enquiry or an account
 * on one of these reaches nobody a week later, and they are what spam and
 * trial abuse are made from.
 *
 * Checked on the server at every public door that takes an address (contact,
 * onboarding briefs, the newsletter, published forms, the maintenance
 * waiting list) and on invitations. A subdomain counts as its domain, so
 * `x.mailinator.com` is refused with `mailinator.com`.
 *
 * A list, not a service: no third party sits in front of an enquiry
 * (AGENTS.md, systems design), and a list this size is a few kilobytes. It
 * will never be complete; it catches the ones people actually use.
 */

const DISPOSABLE = [
  "10minutemail.com", "10minutemail.net", "10minmail.com", "20minutemail.com", "20minutemail.it", "1secmail.com", "1secmail.net", "1secmail.org",
  "anonbox.net", "burnermail.io", "byom.de", "crazymailing.com", "cs.email", "discard.email", "discardmail.com", "dispostable.com",
  "dropmail.me", "emailfake.com", "emailondeck.com", "emltmp.com", "esiix.com", "fakeinbox.com", "fakemail.net", "getairmail.com",
  "getnada.com", "grr.la", "guerrillamail.biz", "guerrillamail.com", "guerrillamail.de", "guerrillamail.net", "guerrillamail.org",
  "guerrillamailblock.com", "harakirimail.com", "inboxkitten.com", "linshiyouxiang.net", "luxusmail.org", "mail.gw", "mail.tm",
  "mailcatch.com", "maildrop.cc", "mailinator.com", "mailinator.net", "mailnesia.com", "mailpoof.com", "minuteinbox.com", "mintemail.com",
  "moakt.com", "mohmal.com", "mvrht.com", "mytemp.email", "nada.email", "pokemail.net", "sharklasers.com", "smailpro.com",
  "spam4.me", "spambox.us", "spamgourmet.com", "temp-mail.io", "temp-mail.org", "tempail.com", "tempinbox.com", "tempmail.com",
  "tempmail.net", "tempmailaddress.com", "tempmailo.com", "tempr.email", "throwawaymail.com", "tmail.ws", "tmpeml.com", "tmpmail.net",
  "tmpmail.org", "trashmail.com", "trashmail.de", "trashmail.net", "trashmail.ws", "trbvm.com", "vomoto.com", "wwjmp.com",
  "xojxe.com", "yoggm.com", "yopmail.com", "yopmail.fr", "yopmail.net",
];

/* Real, lasting inboxes, refused because the owner asked: a client the
   studio cannot reach through their company is one it cannot bill. Take
   these four lines out to accept them again. */
const PRIVACY = ["proton.me", "protonmail.com", "protonmail.ch", "pm.me"];

const REFUSED = new Set([...DISPOSABLE, ...PRIVACY]);

export const REFUSED_EMAIL_MESSAGE =
  "Use an address you will still have next month, ideally your work email. Temporary and anonymous inboxes are not accepted.";

/** True when the address's domain (or a domain it is under) is on the list. */
export function refusedEmail(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at < 0) return false;
  const parts = email.slice(at + 1).trim().toLowerCase().replace(/\.$/, "").split(".");
  for (let i = 0; i < parts.length - 1; i++) if (REFUSED.has(parts.slice(i).join("."))) return true;
  return false;
}
