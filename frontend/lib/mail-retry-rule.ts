/**
 * When a failed email is tried again on its own (lib/mail-retry.ts). Kept
 * apart from the sender so the rule has a check of its own
 * (scripts/check-mail-retry.mjs).
 */
export const AUTO_RETRY_MINUTES = [10, 60, 360] as const;

/* A spam verdict, a timeout or a "try later" (4xx) can pass on a later try.
   A refused address, a missing configuration and the like cannot. */
const RETRYABLE = /high-probability spam|timeout|timed out|ETIMEDOUT|ECONNRESET|ECONNREFUSED|EAI_AGAIN|ESOCKET|Greeting never received|Connection closed|\b4[25]\d\b/i;

export const retryable = (error: string | null | undefined) => RETRYABLE.test(error ?? "");

/* The host answered and said no, so nothing reached the mailbox. A timeout or
   a dropped connection might have delivered it, which is why a workspace
   notice (one send per person, never two) is only retried on these. */
const REFUSED = /high-probability spam|\b4[25]\d\b/i;
const UNCERTAIN = /timeout|timed out|ETIMEDOUT|ECONNRESET|ESOCKET|Connection closed|Greeting never received/i;

export const refusedOutright = (error: string | null | undefined) => REFUSED.test(error ?? "") && !UNCERTAIN.test(error ?? "");

/** The attempt number to make now, or 0 when it is not due or has had its tries. */
export function dueAttempt(row: { error: string | null; createdAt: number; tries: number[]; earlier: number }, now: number): number {
  if (!retryable(row.error)) return 0;
  const attempts = row.earlier + row.tries.length;
  if (attempts >= AUTO_RETRY_MINUTES.length) return 0;
  const last = Math.max(row.createdAt, ...row.tries);
  return now - last >= AUTO_RETRY_MINUTES[attempts] * 60_000 ? attempts + 1 : 0;
}
