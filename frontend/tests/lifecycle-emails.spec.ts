import { expect, test } from "@playwright/test";
import {
  clientJoinedNoticeEmail, clientWelcomeEmail, deliverableApprovedNoticeEmail, entryAssignedEmail, meetingNoticeEmail,
  newDeviceEmail, passwordChangedEmail, revisionRequestedNoticeEmail, staffJoinedEmail, ticketReceivedEmail,
  type Email,
} from "../lib/email-templates";
import { deviceLabel, isNewDevice } from "../lib/auth/device-label";
import { meetingTime, parseMeetingNotice } from "../lib/meetings/notice";

/**
 * THE LIFECYCLE NOTICES, CHECKED AS A SET (accounts, approvals, meetings,
 * questions, security). Pure functions over strings: no browser, no mail
 * server, no database. What each one is held to:
 *
 *   a subject, a complete HTML document and a written plain-text part;
 *   no raw braces or placeholders left in the words a person reads;
 *   hostile input (a company called <script>) escaped in the HTML;
 *   every link absolute, so it works from an inbox;
 *   studio notices point at the notification switch, client notices at the
 *   client's own settings, and the two security notices at neither, saying
 *   plainly that they are always sent;
 *   no unsubscribe on anything the person cannot sensibly unsubscribe from.
 */

const SITE = "https://wedigcreativity.com.ng";
const HOSTILE = `Ada & Sons <script>alert("x")</script>`;
const WHEN = new Date("2026-10-08T09:30:00Z");

type Case = { name: string; email: Email; kind: "studio" | "client" | "security"; url: string };

function all(h = HOSTILE): Case[] {
  return [
    { name: "client welcome", kind: "client", url: `${SITE}/portal`, email: clientWelcomeEmail({ name: `${h} Obi`, company: h, url: `${SITE}/portal` }) },
    { name: "client joined", kind: "studio", url: `${SITE}/admin/clients/c1`, email: clientJoinedNoticeEmail({ name: h, email: "ada@example.com", company: h, url: `${SITE}/admin/clients/c1` }) },
    { name: "staff joined", kind: "studio", url: `${SITE}/admin/users`, email: staffJoinedEmail({ name: h, email: "ada@example.com", url: `${SITE}/admin/users` }) },
    { name: "revision requested", kind: "studio", url: `${SITE}/admin/projects/p1`, email: revisionRequestedNoticeEmail({ company: h, project: h, deliverable: "Logo (v2)", note: `Make it bigger ${h === HOSTILE ? "<b>now</b>" : "now"}\nand bluer`, by: h, url: `${SITE}/admin/projects/p1` }) },
    { name: "deliverable approved", kind: "studio", url: `${SITE}/admin/projects/p1`, email: deliverableApprovedNoticeEmail({ company: h, project: h, deliverable: "Logo (v2)", signedBy: h, url: `${SITE}/admin/projects/p1` }) },
    { name: "entry assigned", kind: "client", url: `${SITE}/portal/projects/p1`, email: entryAssignedEmail({ clientName: `${h} Obi`, form: "brief", project: h, url: `${SITE}/portal/projects/p1` }) },
    { name: "meeting booked", kind: "studio", url: `${SITE}/admin/meetings`, email: meetingNoticeEmail({ kind: "booked", title: h, who: h, email: "ada@example.com", when: "Wed, 14 Oct 2026, 10:00 (WAT)", url: `${SITE}/admin/meetings` }) },
    { name: "meeting cancelled", kind: "studio", url: `${SITE}/admin/meetings`, email: meetingNoticeEmail({ kind: "cancelled", title: "Intro call", who: "Ada", email: "", when: "Wed, 14 Oct 2026, 10:00 (WAT)", url: `${SITE}/admin/meetings` }) },
    { name: "ticket received", kind: "client", url: `${SITE}/portal/support/t1`, email: ticketReceivedEmail({ clientName: `${h} Obi`, subject: h, url: `${SITE}/portal/support/t1` }) },
    { name: "new device", kind: "security", url: `${SITE}/forgot-password`, email: newDeviceEmail({ name: `${h} Obi`, device: h, when: WHEN, resetUrl: `${SITE}/forgot-password` }) },
    { name: "password changed", kind: "security", url: `${SITE}/forgot-password`, email: passwordChangedEmail({ name: `${h} Obi`, when: WHEN, how: "changed", resetUrl: `${SITE}/forgot-password` }) },
    { name: "password reset", kind: "security", url: `${SITE}/forgot-password`, email: passwordChangedEmail({ when: WHEN, how: "reset", resetUrl: `${SITE}/forgot-password` }) },
  ];
}

test("each is a complete document with a subject and a written plain-text part", () => {
  const failures: string[] = [];
  /* Calm input here: the text part is plain text, so a hostile name would show its brackets there by design. */
  for (const { name, email } of all("Ada Obi")) {
    if (!email.subject.trim()) failures.push(`${name}: no subject`);
    if (!email.html.startsWith("<!doctype html>")) failures.push(`${name}: no doctype`);
    if (!/<title>[^<]+<\/title>/.test(email.html)) failures.push(`${name}: no <title>`);
    if (!email.html.trimEnd().endsWith("</html>")) failures.push(`${name}: not closed`);
    if (/display\s*:\s*(flex|grid)/i.test(email.html)) failures.push(`${name}: flex or grid`);
    if (/<script\b/i.test(email.html)) failures.push(`${name}: carries a live script`);
    if (email.text.length < 240) failures.push(`${name}: text part too short`);
    if (/<[a-z/][^>]*>/i.test(email.text)) failures.push(`${name}: markup in the text part`);
    if (/&[a-z]+;|&#\d+;/i.test(email.text)) failures.push(`${name}: HTML entities in the text part`);
  }
  expect(failures, failures.join("\n")).toEqual([]);
});

test("no raw braces or placeholders are left in what a person reads", () => {
  const failures: string[] = [];
  for (const { name, email } of all()) {
    /* The subject and the text part carry no CSS, so no brace belongs in them at all. */
    if (/[{}]/.test(email.subject)) failures.push(`${name}: brace in the subject`);
    if (/[{}]/.test(email.text)) failures.push(`${name}: brace in the text`);
    for (const part of [email.subject, email.text, email.html]) {
      if (/\$\{|\{\{|\}\}|\bundefined\b|\bnull\b|\[object /.test(part)) failures.push(`${name}: placeholder left in`);
    }
  }
  expect(failures, failures.join("\n")).toEqual([]);
});

test("input from a person is escaped in the HTML", () => {
  const failures: string[] = [];
  for (const { name, email } of all()) {
    if (email.html.includes(`<script>alert("x")</script>`)) failures.push(`${name}: raw script tag`);
    if (email.html.includes("<b>now</b>")) failures.push(`${name}: raw tag from a note`);
  }
  expect(failures, failures.join("\n")).toEqual([]);
  const notice = all().find((c) => c.name === "client joined")!.email.html;
  expect(notice).toContain("Ada &amp; Sons &lt;script&gt;");
  /* A note keeps its line breaks, as breaks. */
  const revision = all().find((c) => c.name === "revision requested")!.email.html;
  expect(revision).toContain("Make it bigger &lt;b&gt;now&lt;/b&gt;<br>and bluer");
});

test("every link is absolute, and the button goes where the notice says", () => {
  const failures: string[] = [];
  for (const { name, email, url } of all()) {
    const hrefs = [...email.html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
    for (const h of hrefs) if (!/^(https:\/\/|mailto:)/.test(h)) failures.push(`${name}: relative link ${h}`);
    if (!hrefs.includes(url)) failures.push(`${name}: the button is not ${url}`);
    if (!email.text.includes(url)) failures.push(`${name}: the text part does not carry ${url}`);
  }
  expect(failures, failures.join("\n")).toEqual([]);
});

test("each points at the switch its reader owns, and security notices are always sent", () => {
  for (const { name, email, kind } of all()) {
    const staff = email.html.includes(`${SITE}/admin/settings/notifications`);
    const client = email.html.includes(`${SITE}/portal/settings`);
    if (kind === "studio") { expect(staff, `${name} should link the notification switch`).toBe(true); expect(client, name).toBe(false); }
    if (kind === "client") { expect(client, `${name} should link the client's own settings`).toBe(true); expect(staff, name).toBe(false); }
    if (kind === "security") {
      expect(staff || client, `${name} must not offer a switch`).toBe(false);
      expect(email.html, name).toContain("This is a security notice, so it is always sent.");
      expect(email.html, name).not.toContain("Unsubscribe");
    }
  }
});

test("only notices to a client carry the unsubscribe line, and the studio's do not", () => {
  for (const { name, email, kind } of all()) {
    expect(Boolean(email.unsubscribe), name).toBe(kind === "client");
  }
});

test("the words say what happened, in plain words, with no city name", () => {
  const by = (n: string) => all().find((c) => c.name === n)!.email;
  expect(by("client welcome").subject).toBe("Welcome to your client portal");
  expect(by("client welcome").text).toContain("approve it or ask for changes");
  expect(by("staff joined").text).toContain("You will get one more note if they finish the welcome.");
  expect(by("meeting booked").subject).toBe(`Meeting booked: ${HOSTILE}`);
  expect(by("meeting cancelled").text).toContain("A meeting was cancelled.");
  expect(by("ticket received").text).toContain("We usually reply the same working day.");
  expect(by("new device").text).toContain("reset your password now");
  expect(by("password reset").text).toContain("reset with an emailed link");
  expect(by("password changed").text).toContain("changed from your account settings");
  for (const { name, email } of all()) {
    expect(/lagos/i.test(email.subject + email.text), `${name} names a city`).toBe(false);
    expect(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(email.subject + email.text), `${name} has an emoji`).toBe(false);
  }
});

test("a new device is told only when others are signed in and none is this one", () => {
  const chromeWin = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36";
  const chromeWin2 = "Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0 Safari/537.36";
  const safariIos = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
  expect(deviceLabel(chromeWin)).toBe("Chrome on Windows");
  expect(deviceLabel(null)).toBe("Unknown device");
  expect(isNewDevice(chromeWin, [])).toBe(false); // the first sign-in is not "new"
  expect(isNewDevice(chromeWin2, [chromeWin])).toBe(false); // the same browser and system, a newer build
  expect(isNewDevice(safariIos, [chromeWin])).toBe(true);
  expect(isNewDevice(safariIos, [chromeWin, safariIos])).toBe(false);
  expect(isNewDevice(null, [chromeWin])).toBe(true);
});

test("a booking webhook becomes a studio notice, and nothing else does", () => {
  const body = {
    triggerEvent: "BOOKING_CREATED",
    payload: { uid: "abc123", title: "Intro call", startTime: "2026-10-14T09:00:00.000Z", attendees: [{ name: "Ada Obi", email: "ada@example.com" }] },
  };
  expect(parseMeetingNotice(body)).toEqual({ kind: "booked", uid: "abc123", title: "Intro call", who: "Ada Obi", email: "ada@example.com", when: "Wed, 14 Oct 2026, 10:00 (WAT)" });
  expect(parseMeetingNotice({ ...body, triggerEvent: "BOOKING_CANCELLED" })?.kind).toBe("cancelled");
  expect(parseMeetingNotice({ ...body, triggerEvent: "BOOKING_RESCHEDULED" })?.kind).toBe("rescheduled");
  expect(parseMeetingNotice({ ...body, triggerEvent: "BOOKING_REQUESTED" })).toBeNull();
  expect(parseMeetingNotice({ triggerEvent: "BOOKING_CREATED", payload: {} })).toBeNull();
  expect(parseMeetingNotice(null)).toBeNull();
  expect(parseMeetingNotice("nope")).toBeNull();
  /* Missing and oversized fields are handled, not thrown on. */
  const odd = parseMeetingNotice({ triggerEvent: "BOOKING_CREATED", payload: { uid: "u", title: "x".repeat(900), attendees: [] } })!;
  expect(odd.title.length).toBe(160);
  expect(odd.who).toBe("Someone");
  expect(odd.when).toBe("A time was not given");
  expect(meetingTime("not a date")).toBe("A time was not given");
});
