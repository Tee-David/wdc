import { expect, test } from "@playwright/test";
import { readCompletion, syncFromAccount, writeCompletion } from "../lib/tours/storage";

/**
 * The browser copy of tour progress follows the account.
 *
 * Run against the real storage module with `fetch` and `localStorage`
 * replaced, because the behaviour under test is the merge: what the account
 * knows arrives here, what only this browser knows goes up, and nothing is
 * written anywhere when there is no account to write to.
 */

class Memory {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
}

type Call = { method: string; body?: unknown };
function install(answer: { status: number; records?: Record<string, unknown> }) {
  const calls: Call[] = [];
  (globalThis as unknown as { localStorage: Memory }).localStorage = new Memory();
  globalThis.fetch = (async (_url: string, init?: RequestInit) => {
    calls.push({ method: init?.method ?? "GET", body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if ((init?.method ?? "GET") === "GET") {
      return new Response(answer.status === 200 ? JSON.stringify({ records: answer.records ?? {} }) : null, { status: answer.status });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }) as typeof fetch;
  return calls;
}

const TOURS = [{ id: "client-welcome", version: 1 }, { id: "client-walkthrough", version: 1 }];

test.describe.configure({ mode: "serial" });

test("without an account nothing is sent, and the local copy stands", async () => {
  const calls = install({ status: 204 });
  writeCompletion("client-welcome", 1, "completed");
  expect(await syncFromAccount(TOURS)).toBe(false);
  expect(readCompletion("client-welcome", 1)?.status).toBe("completed");
  expect(calls.filter((c) => c.method === "POST")).toHaveLength(0);
});

test("the account's record fills an empty browser, and this browser's goes up", async () => {
  const calls = install({ status: 200, records: { "client-walkthrough@1": { status: "skipped", at: "2026-09-20T10:00:00.000Z" } } });
  /* Known only here, from before this browser had talked to the account. */
  localStorage.setItem("wdc-admin-tour:client-welcome@1", JSON.stringify({ status: "completed", at: "2026-09-19T10:00:00.000Z" }));

  expect(await syncFromAccount(TOURS)).toBe(true);
  expect(readCompletion("client-walkthrough", 1)?.status).toBe("skipped");
  const posts = calls.filter((c) => c.method === "POST").map((c) => c.body);
  expect(posts).toEqual([{ tour: "client-welcome@1", status: "completed" }]);

  /* And once the account has answered, later writes go to it too. */
  writeCompletion("client-walkthrough", 1, "completed");
  expect(calls.at(-1)?.body).toEqual({ tour: "client-walkthrough@1", status: "completed" });
});
