export const DEFAULT_MAIL_FROM_NAME = "We Dig Creativity";

/** A named mailbox every time, so every message carries the studio identity. */
export function mailFrom(name: string | undefined, address: string) {
  return { name: name?.trim() || DEFAULT_MAIL_FROM_NAME, address };
}
