import { expect, test } from "@playwright/test";
import { GOOGLE_ALLOWED_ROLES, googleAdmission } from "../lib/auth-google";

/**
 * THE GOOGLE DOOR, EXERCISED.
 *
 * A valid Google account must not gain admin unless its address already maps
 * to an approved owner or staff row. That sentence is one `if` in a callback
 * Better Auth invokes during an OAuth round trip, which is the hardest thing
 * in this repository to reach from a browser test and the worst thing to leave
 * unproven: every failure below hands somebody a session they should not have,
 * and none of them look broken from the outside.
 *
 * These run against the real `googleAdmission` -- the function lib/auth.ts
 * actually calls -- with the database lookup stubbed. Stubbing the lookup is
 * the point rather than a compromise: it is the only way to ask what happens
 * when the database REFUSES to answer, which is the branch a reachable
 * database can never demonstrate.
 *
 * No browser is needed, so `chromium` is not launched; Playwright is used here
 * purely as the runner the rest of the suite already uses.
 */

/** A lookup that answers, recording what it was asked. */
function lookup(role: string | null) {
  const asked: string[] = [];
  const fn = async (email: string) => { asked.push(email); return role; };
  return { fn, asked };
}

/** A database that will not answer. */
const unavailable = async () => { throw new Error("connection refused"); };

/** A lookup that must never be reached. */
const never = async () => { throw new Error("the lookup was called when it should not have been"); };

test("an owner is let in", async () => {
  const db = lookup("owner");
  expect(await googleAdmission("google", "owner@wedigcreativity.com.ng", db.fn)).toEqual({ allowed: true });
});

test("staff are let in", async () => {
  expect(await googleAdmission("google", "staff@wedigcreativity.com.ng", lookup("staff").fn))
    .toEqual({ allowed: true });
});

test("a client with a perfectly valid Google account is refused", async () => {
  /* THE ONE THE CHECKLIST IS ABOUT. Nothing is wrong with this identity:
     Google verified it and there is a row for it. It is refused because the
     row is not one of ours to admit through this door. */
  const decision = await googleAdmission("google", "someone@gmail.com", lookup("client").fn);
  expect(decision.allowed).toBe(false);
  expect(decision).toMatchObject({ error: "not_approved" });
});

test("a Google account with no row at all is refused", async () => {
  const decision = await googleAdmission("google", "stranger@gmail.com", lookup(null).fn);
  expect(decision).toMatchObject({ allowed: false, error: "not_approved" });
});

test("a stranger and a client are refused in exactly the same words", async () => {
  /* Two different sentences would turn this button into a way of finding out
     who works here, one address at a time. */
  const stranger = await googleAdmission("google", "stranger@gmail.com", lookup(null).fn);
  const client = await googleAdmission("google", "client@gmail.com", lookup("client").fn);
  expect(stranger).toEqual(client);
});

test("a database that will not answer refuses, it does not admit", async () => {
  /* FAIL CLOSED. If this ever returns `allowed`, an outage becomes a way in
     for anybody with a Google account. */
  const decision = await googleAdmission("google", "owner@wedigcreativity.com.ng", unavailable);
  expect(decision.allowed).toBe(false);
  expect(decision).toMatchObject({ error: "verification_unavailable" });
});

test("a provider that is not Google is refused without touching the database", async () => {
  for (const provider of ["github", "facebook", "apple", "", null, undefined]) {
    const decision = await googleAdmission(provider, "owner@wedigcreativity.com.ng", never);
    expect(decision, `provider ${String(provider)}`).toMatchObject({
      allowed: false,
      error: "provider_not_allowed",
    });
  }
});

test("an identity with no usable email is refused without touching the database", async () => {
  for (const email of ["", "   ", null, undefined, 42, {}]) {
    const decision = await googleAdmission("google", email, never);
    expect(decision, `email ${JSON.stringify(email)}`).toMatchObject({
      allowed: false,
      error: "email_required",
    });
  }
});

test("the address is matched in lower case, however Google spells it", async () => {
  /* Google will happily hand back `Owner@WeDigCreativity.com.NG`. The row is
     stored lower case, and `storedRoleFor` compares `lower("email")`, so the
     address this function passes down has to be lowered too or an owner is
     refused by their own capital letters. */
  const db = lookup("owner");
  expect(await googleAdmission("google", "  Owner@WeDigCreativity.COM.ng  ", db.fn))
    .toEqual({ allowed: true });
  expect(db.asked).toEqual(["owner@wedigcreativity.com.ng"]);
});

test("only owner and staff are on the list", async () => {
  /* Pinned deliberately. Adding "client" here is a one-word change that would
     open the door to every client with a Gmail address, and it should not be
     possible to do it quietly. */
  expect([...GOOGLE_ALLOWED_ROLES].sort()).toEqual(["owner", "staff"]);
});

test("a role nobody has heard of is refused", async () => {
  for (const role of ["admin", "superuser", "OWNER", "staff ", "guest"]) {
    const decision = await googleAdmission("google", "x@example.com", lookup(role).fn);
    expect(decision, `role ${JSON.stringify(role)}`).toMatchObject({
      allowed: false,
      error: "not_approved",
    });
  }
});
