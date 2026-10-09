export const DEFAULT_MAIL_FROM_NAME = "We Dig Creativity";

/** A stable public SMTP greeting, rather than a serverless instance's localhost/IP. */
export const smtpHostname = (address: string) => address.trim().split("@").pop();

/** A named mailbox every time, so every message carries the studio identity. */
export function mailFrom(name: string | undefined, address: string) {
  return { name: name?.trim() || DEFAULT_MAIL_FROM_NAME, address };
}
