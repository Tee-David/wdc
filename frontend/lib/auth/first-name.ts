const GENERIC = new Set(["info", "admin", "hello", "contact", "support", "team", "sales", "office", "mail", "hi", "enquiries", "accounts", "billing", "no", "noreply"]);

/**
 * A first name to greet with, guessed from the address, or null.
 *
 * `tee.david@gmail.com` gives "Tee". The guess is only a greeting, never
 * stored as a name and never sent anywhere, so being wrong costs a smile at
 * most. It declines rather than guess badly: a role address like `info@`, or
 * a segment too short to be a name, gets no greeting at all.
 */
export function firstNameFromEmail(email: string): string | null {
  const local = email.trim().split("@")[0] ?? "";
  const segment = local.split(/[._+\-\d]+/).find((part) => part.length > 0) ?? "";
  if (!/^[\p{L}]{2,}$/u.test(segment)) return null;
  if (GENERIC.has(segment.toLowerCase())) return null;
  const name = segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase();
  return name.slice(0, 14);
}

/** The first word of a stored full name. */
export const firstWord = (name: string | null | undefined) => name?.trim().split(/\s+/)[0] || null;
