import { expect, test } from "@playwright/test";
import { REFUSED_EMAIL_MESSAGE, refusedEmail } from "../lib/email-domains";

/** Temporary and anonymous inboxes are refused at the public doors (lib/email-domains.ts). */

test("throwaway and privacy inboxes are refused, subdomains too; ordinary ones are not", () => {
  for (const e of ["a@mailinator.com", "B@YOPMAIL.COM", "x@sub.mailinator.com", "me@proton.me", "me@protonmail.com", "t@10minutemail.com"]) {
    expect(refusedEmail(e), e).toBe(true);
  }
  for (const e of ["ada@gmail.com", "ceo@wedigcreativity.com.ng", "me@notmailinator.com", "x@protonmail.com.example.org"]) {
    expect(refusedEmail(e), e).toBe(false);
  }
});

test("the contact endpoint refuses a throwaway address before anything is stored", async ({ request, baseURL }) => {
  const res = await request.post("/api/contact", {
    headers: { origin: baseURL ?? "http://localhost:3100", "x-forwarded-for": `10.9.${Math.floor(Math.random() * 250)}.7` },
    data: { first: "Test", last: "Person", email: "someone@mailinator.com", topic: "Branding & Design", message: "A message long enough to pass." },
  });
  expect(res.status()).toBe(422);
  expect((await res.json()).error).toBe(REFUSED_EMAIL_MESSAGE);
});
