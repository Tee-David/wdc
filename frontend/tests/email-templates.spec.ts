import { expect, test } from "@playwright/test";
import { naira } from "../lib/admin/types";
import {
  deliverableReadyEmail,
  enquiryReceiptEmail,
  invoiceEmail,
  onboardingInvitationEmail,
  onboardingReminderEmail,
  passwordResetEmail,
  projectStageEmail,
  quoteEmail,
  receiptEmail,
  signOffEmail,
  type Email,
} from "../lib/email-templates";

/**
 * THE TEN MESSAGES, CHECKED AS A SET.
 *
 * These assertions are not style policing. Every one of them is a way a
 * transactional email quietly fails after it has been written and before
 * anybody notices:
 *
 *   a fragment instead of a document -- Gmail guesses the encoding, iOS
 *   shrinks it to a 980px page, and filters score it down;
 *   a `text` part that is a tag dump, or absent -- the version a watch and a
 *   screen reader get is the unreadable one, and HTML-only is a bulk signal;
 *   flexbox in the layout -- invisible everywhere except Outlook, where the
 *   message collapses into one column of unstyled text;
 *   white on the orange button -- 2.95:1, the exact contrast failure
 *   button-colours.spec.ts already pins for the site;
 *   an unescaped client name -- a company called `<script>` is a company;
 *   an unsubscribe on the password reset -- offering somebody the chance to
 *   opt out of account security.
 *
 * No browser is needed: these are pure functions over strings, and the spec
 * imports the same module the server does.
 */

const URL_UNDER_TEST = "https://wedigcreativity.com.ng/portal/projects/atlas";
const HOSTILE = `Ada & Sons <script>alert("x")</script>`;

const LINES = [
  { description: "Brand identity system", qty: 1, unit: 85_000_00 },
  { description: "Launch collateral", qty: 3, unit: 12_500_00 },
];
const TOTALS = { subtotal: 122_500_00, vat: 9_187_50, vatRate: 7.5, total: 131_687_50 };

/* Fixed instants, so a spec run at 23:55 Lagos time does not disagree with one
   at 00:05 about what day the invoice is due. */
const ISSUED = new Date("2026-09-01T09:00:00Z");
const DUE = new Date("2026-09-15T09:00:00Z");

async function everyEmail(): Promise<{ name: string; email: Email }[]> {
  return [
    { name: "enquiry receipt", email: enquiryReceiptEmail({ firstName: "Ada", topic: "a new website" }) },
    { name: "onboarding invitation", email: onboardingInvitationEmail({ name: "Ada", service: "Web design", url: URL_UNDER_TEST, expiresInDays: 14 }) },
    { name: "onboarding reminder", email: onboardingReminderEmail({ name: "Ada", service: "Web design", url: URL_UNDER_TEST, progressPercent: 40, daysLeft: 3 }) },
    { name: "quote", email: quoteEmail({ clientName: "Ada", quoteNumber: "QTE-2026-014", projectTitle: "Atlas rebrand", lines: LINES, totals: TOTALS, validUntil: DUE, url: URL_UNDER_TEST }) },
    { name: "invoice", email: await invoiceEmail({ clientName: "Ada", number: "INV-2026-014", projectTitle: "Atlas rebrand", lines: LINES, totals: TOTALS, paid: 0, issued: ISSUED, due: DUE, url: URL_UNDER_TEST }) },
    { name: "receipt", email: await receiptEmail({ clientName: "Ada", receiptNumber: "RCP-2026-009", invoiceNumber: "INV-2026-014", amount: 131_687_50, method: "Bank transfer", reference: "TRF-88213", paidAt: DUE, balance: 0, url: URL_UNDER_TEST }) },
    { name: "project stage change", email: projectStageEmail({ clientName: "Ada", projectTitle: "Atlas rebrand", fromStage: "Discovery", toStage: "In progress", note: "Research is signed off and design starts on Monday.", url: URL_UNDER_TEST }) },
    { name: "deliverable ready", email: deliverableReadyEmail({ clientName: "Ada", projectTitle: "Atlas rebrand", deliverable: "The first design route", url: URL_UNDER_TEST, respondBy: DUE }) },
    { name: "sign-off", email: signOffEmail({ clientName: "Ada", projectTitle: "Atlas rebrand", deliverable: "The first design route", signedBy: "Ada Obi", signedAt: DUE, url: URL_UNDER_TEST }) },
    { name: "password reset", email: passwordResetEmail({ name: "Ada", url: URL_UNDER_TEST, expiresInMinutes: 60 }) },
  ];
}

test("all ten messages exist and are complete HTML documents", async () => {
  const all = await everyEmail();
  expect(all).toHaveLength(10);

  const failures: string[] = [];
  for (const { name, email } of all) {
    if (!email.html.startsWith("<!doctype html>")) failures.push(`${name}: no doctype`);
    if (!email.html.includes('<html lang="en"')) failures.push(`${name}: no language on <html>`);
    if (!/<title>[^<]+<\/title>/.test(email.html)) failures.push(`${name}: no <title>`);
    if (!email.html.includes('<meta charset="utf-8">')) failures.push(`${name}: no charset`);
    if (!email.html.includes('name="viewport"')) failures.push(`${name}: no viewport`);
    if (!email.html.trimEnd().endsWith("</html>")) failures.push(`${name}: document is not closed`);
    if (!email.subject.trim()) failures.push(`${name}: no subject`);
  }
  expect(failures, failures.join("\n")).toEqual([]);
});

test("the layout is tables, not flexbox or grid", async () => {
  const failures: string[] = [];
  for (const { name, email } of await everyEmail()) {
    if (!email.html.includes('<table role="presentation"')) failures.push(`${name}: no presentation table`);
    /* Outlook renders through Word, which has neither. A message that relies
       on either collapses there into one column of unstyled text. */
    if (/display\s*:\s*(flex|grid)/i.test(email.html)) failures.push(`${name}: uses flex or grid`);
    if (/<link\b/i.test(email.html)) failures.push(`${name}: links an external stylesheet`);
    if (/<script\b/i.test(email.html)) failures.push(`${name}: carries a script`);
  }
  expect(failures, failures.join("\n")).toEqual([]);
});

test("every message has a plain-text alternative that reads as the message", async () => {
  const failures: string[] = [];
  for (const { name, email } of await everyEmail()) {
    const text = email.text;
    if (text.length < 240) failures.push(`${name}: text part is ${text.length} characters, too short to be the message`);
    if (/<[a-z/][^>]*>/i.test(text)) failures.push(`${name}: text part contains markup`);
    if (/&[a-z]+;|&#\d+;/i.test(text)) failures.push(`${name}: text part contains HTML entities`);
    /* The two ways a "plain-text alternative" is faked. */
    if (/view (this|the) (email|message) in|see the html/i.test(text)) failures.push(`${name}: text part defers to the HTML version`);
    /* Written prose, not a list of fields: at least one full sentence that is
       not one of the indented data rows. */
    const sentences = text.split("\n").filter((line) => !line.startsWith("  ") && /[a-z]{3,}.*\./.test(line));
    if (sentences.length < 3) failures.push(`${name}: text part has ${sentences.length} prose lines, so it reads as a field dump`);
    /* The footer the HTML carries, carried here too. */
    if (!text.includes("wedigcreativity.com.ng")) failures.push(`${name}: text part has no footer`);
    if (!text.includes("BN 8480926")) failures.push(`${name}: text part has no legal line`);
  }
  expect(failures, failures.join("\n")).toEqual([]);
});

test("the link in the HTML is the link in the text", async () => {
  const failures: string[] = [];
  for (const { name, email } of await everyEmail()) {
    if (name === "enquiry receipt") continue; // the only one with nowhere to send anybody
    if (!email.html.includes(URL_UNDER_TEST)) failures.push(`${name}: the URL is missing from the HTML part`);
    if (!email.text.includes(URL_UNDER_TEST)) failures.push(`${name}: the URL is missing from the text part`);
  }
  expect(failures, failures.join("\n")).toEqual([]);
});

test("no filled button carries a white label on orange", async () => {
  const failures: string[] = [];
  for (const { name, email } of await everyEmail()) {
    /* Every cell painted orange, and the colour of the anchor inside it. */
    for (const match of email.html.matchAll(/bgcolor="#ff6500"[\s\S]{0,400}?<\/a>/gi)) {
      const block = match[0];
      if (!/color\s*:\s*#000000/i.test(block)) failures.push(`${name}: an orange button's label is not black`);
      if (/color\s*:\s*#fff(fff)?\b/i.test(block)) failures.push(`${name}: an orange button's label is white (2.95:1)`);
    }
  }
  expect(failures, failures.join("\n")).toEqual([]);
});

test("an unsubscribe is offered exactly where one is owed", async () => {
  const owed = new Set(["enquiry receipt", "onboarding reminder", "project stage change"]);
  const failures: string[] = [];
  for (const { name, email } of await everyEmail()) {
    const declared = email.unsubscribe === true;
    if (declared !== owed.has(name)) failures.push(`${name}: unsubscribe is ${declared}, expected ${owed.has(name)}`);
    /* The flag drives the `List-Unsubscribe` header in lib/email.ts; the body
       has to make the same offer, or the header is a promise the message does
       not keep. */
    const inHtml = /Unsubscribe<\/a>/.test(email.html);
    const inText = /unsubscribe/i.test(email.text);
    if (declared && !inHtml) failures.push(`${name}: declares unsubscribe but the HTML footer does not offer one`);
    if (declared && !inText) failures.push(`${name}: declares unsubscribe but the text footer does not offer one`);
    if (!declared && inHtml) failures.push(`${name}: offers an unsubscribe it did not declare`);
  }
  expect(failures, failures.join("\n")).toEqual([]);
});

test("the password reset offers no way to unsubscribe from account security", () => {
  const email = passwordResetEmail({ name: "Ada", url: URL_UNDER_TEST, expiresInMinutes: 60 });
  expect(email.unsubscribe).toBeUndefined();
  expect(email.html).not.toMatch(/Unsubscribe<\/a>/);
  expect(email.text).not.toMatch(/unsubscribe/i);
});

test("the invoice and the receipt carry a QR made by the site's own encoder", async () => {
  for (const email of [
    await invoiceEmail({ clientName: "Ada", number: "INV-2026-014", projectTitle: "Atlas rebrand", lines: LINES, totals: TOTALS, paid: 0, issued: ISSUED, due: DUE, url: URL_UNDER_TEST }),
    await receiptEmail({ clientName: "Ada", receiptNumber: "RCP-2026-009", invoiceNumber: "INV-2026-014", amount: 131_687_50, method: "Bank transfer", reference: "TRF-88213", paidAt: DUE, balance: 0, url: URL_UNDER_TEST }),
  ]) {
    expect(email.attachments).toHaveLength(1);
    const qr = email.attachments![0];
    expect(qr.contentType).toBe("image/svg+xml");
    expect(qr.content.startsWith("<svg")).toBe(true);
    /* One compound path of modules, which is what lib/qr.ts produces. */
    expect(qr.content).toContain('<path fill="#000065"');
    /* NOT the version with our mark punched out: an `<image href>` pointing at
       our site renders as a hole in every client that blocks remote images,
       and a hole is damage to the code. */
    expect(qr.content).not.toContain("<image");
    /* Referenced from the HTML, and never the only way to reach the document. */
    expect(email.html).toContain(`src="cid:${qr.cid}"`);
    expect(email.html).toContain(URL_UNDER_TEST);
  }
});

test("money is rendered once, from the totals the caller computed", async () => {
  const email = await invoiceEmail({
    clientName: "Ada", number: "INV-2026-014", projectTitle: "Atlas rebrand",
    lines: LINES, totals: TOTALS, paid: 31_687_50, issued: ISSUED, due: DUE, url: URL_UNDER_TEST,
  });
  /* The template must not recompute: it is handed 131,687.50 with 31,687.50
     already paid, and the only figure it may derive is the difference. */
  expect(email.html).toContain(naira(TOTALS.total));
  expect(email.html).toContain(naira(31_687_50));
  expect(email.html).toContain(naira(100_000_00));
  expect(email.text).toContain(naira(100_000_00));
  expect(email.subject).toContain(naira(100_000_00));
  /* A part payment is described as one, in both parts. */
  expect(email.html).toContain("Balance outstanding");
  expect(email.text).toContain("Balance outstanding");
});

test("a hostile client name cannot inject markup", async () => {
  const email = await receiptEmail({
    clientName: HOSTILE, receiptNumber: "RCP-1", invoiceNumber: "INV-1",
    amount: 1_000_00, method: HOSTILE, reference: HOSTILE, paidAt: DUE, balance: 0, url: URL_UNDER_TEST,
  });
  expect(email.html).not.toContain("<script>");
  expect(email.html).toContain("&lt;script&gt;");
  /* The text part is text: it needs no escaping and must not be given any. */
  expect(email.text).toContain(HOSTILE);
  expect(email.text).not.toContain("&lt;");
});

test("a link that is not ours never reaches an href", () => {
  const email = passwordResetEmail({ url: "javascript:alert(1)", expiresInMinutes: 60 });
  expect(email.html).not.toContain("javascript:");
  expect(email.html).toContain('href="https://wedigcreativity.com.ng"');
});
