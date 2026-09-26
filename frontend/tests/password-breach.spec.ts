import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";
import { BREACHED_MESSAGE, breachCount, breachProblem, UNCHECKED_MESSAGE } from "../lib/auth/breached";

/**
 * The breached-password check (lib/auth/breached.ts), against a stand-in for
 * Have I Been Pwned: only five characters of the hash are sent, a match in
 * the answer is refused, and no answer at all is refused too (fail closed).
 */

const hash = (p: string) => createHash("sha1").update(p).digest("hex").toUpperCase();

function range(lines: string[]) {
  const asked: string[] = [];
  const fetcher = async (url: string) => { asked.push(url); return new Response(lines.join("\r\n"), { status: 200 }); };
  return { fetcher, asked };
}

test("sends only the first five characters of the hash, and finds a leaked password", async () => {
  const h = hash("P@ssw0rd!");
  const { fetcher, asked } = range(["0000000000000000000000000000000000A:0", `${h.slice(5)}:52000`]);
  expect(await breachCount("P@ssw0rd!", fetcher)).toBe(52000);
  expect(asked).toEqual([`https://api.pwnedpasswords.com/range/${h.slice(0, 5)}`]);
  expect(asked[0]).not.toContain(h.slice(5));
});

test("a password in no breach passes; padding lines are not matches", async () => {
  const { fetcher } = range(["0000000000000000000000000000000000A:0"]);
  expect(await breachProblem("Unlikely-Horse-47!", fetcher)).toBeNull();
  const leaked = range([`${hash("Summer2024!").slice(5)}:9`]);
  expect(await breachProblem("Summer2024!", leaked.fetcher)).toBe(BREACHED_MESSAGE);
});

test("no answer is a refusal, not a pass", async () => {
  expect(await breachProblem("Unlikely-Horse-47!", async () => { throw new Error("offline"); })).toBe(UNCHECKED_MESSAGE);
  expect(await breachProblem("Unlikely-Horse-47!", async () => new Response("", { status: 503 }))).toBe(UNCHECKED_MESSAGE);
});
