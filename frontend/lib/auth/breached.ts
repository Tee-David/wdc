import { createHash } from "node:crypto";

/**
 * HAS THIS PASSWORD ALREADY LEAKED? Asked of Have I Been Pwned's range API
 * before any new password is stored (reset, change, first password from an
 * invitation).
 *
 * K-ANONYMITY: only the first five characters of the password's SHA-1 leave
 * this server; the API answers with every leaked hash that starts with them,
 * and the match is made here. The password, and its full hash, never do.
 * `Add-Padding` makes every answer the same size, so the response cannot be
 * read off the wire either.
 *
 * FAILS CLOSED (AGENTS.md): if the check cannot be made, the password is not
 * stored, and the person is told to try again in a minute. The one switch is
 * PASSWORD_BREACH_CHECK=off, for a local machine with no internet; production
 * never sets it.
 */

export const BREACHED_MESSAGE =
  "That password has appeared in a data breach, so it is one of the first that would be tried. Choose another, or use Suggest one.";
export const UNCHECKED_MESSAGE =
  "We could not check that password against known breaches just now, so it was not saved. Try again in a minute.";

type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

/** How often it has been seen in breaches, 0 for never; null when it could not be asked. */
export async function breachCount(password: string, fetcher: Fetcher = fetch): Promise<number | null> {
  const sha1 = createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();
  const prefix = sha1.slice(0, 5);
  const rest = sha1.slice(5);
  try {
    const res = await fetcher(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true", "User-Agent": "wdc-password-check" },
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    for (const line of (await res.text()).split("\n")) {
      const [suffix, count] = line.trim().split(":");
      /* Padding lines carry a count of 0 and are not real. */
      if (suffix === rest) return Number(count) || 0;
    }
    return 0;
  } catch {
    return null;
  }
}

/** The sentence to show, or null when the password may be stored. */
export async function breachProblem(password: string, fetcher?: Fetcher): Promise<string | null> {
  if (process.env.PASSWORD_BREACH_CHECK === "off") return null;
  const n = await breachCount(password, fetcher);
  if (n === null) return UNCHECKED_MESSAGE;
  return n > 0 ? BREACHED_MESSAGE : null;
}
