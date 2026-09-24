/** Trimmed, with the domain lower-cased. The local part is left as typed. */
export function normaliseEmail(value: string) {
  const trimmed = value.trim();
  const at = trimmed.lastIndexOf("@");
  return at < 0 ? trimmed : trimmed.slice(0, at) + "@" + trimmed.slice(at + 1).toLowerCase();
}

/**
 * The address Better Auth is handed: fully lower-cased, because its email
 * plugins lower-case the whole address when they store and compare, and the
 * password route matches case-insensitively. One spelling everywhere means a
 * link, a code and a password all find the same account.
 */
export const authEmail = (value: string) => value.trim().toLowerCase();

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const isEmail = (value: string) => {
  const email = value.trim();
  return email.length <= 254 && EMAIL.test(email);
};

/** Exactly one @ with something before it: enough to start looking like an address. */
export const hasAt = (value: string) => /^[^@\s]+@[^@]*$/.test(value.trim());

export const isCode = (value: string) => /^\d{6}$/.test(value);
