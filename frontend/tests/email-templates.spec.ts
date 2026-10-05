import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { naira } from "../lib/admin/types";
import {
  addressTo,
  deliverableReadyEmail,
  enquiryReceiptEmail,
  invoiceEmail,
  onboardingInvitationEmail,
  onboardingNextStepsEmail,
  onboardingReminderEmail,
  passwordResetEmail,
  projectStageEmail,
  quoteEmail,
  receiptEmail,
  signInEmail,
  signOffEmail,
  siteReportEmail,
  type Email,
} from "../lib/email-templates";

/**
 * THE TRANSACTIONAL SET, CHECKED AS A SET.
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
    { name: "onboarding next steps", email: onboardingNextStepsEmail({ name: "Ada", service: "Full-Stack Web Development", company: "Ada & Co" }) },
    { name: "onboarding reminder", email: onboardingReminderEmail({ name: "Ada", service: "Web design", url: URL_UNDER_TEST, progressPercent: 40, daysLeft: 3 }) },
    { name: "quote", email: quoteEmail({ clientName: "Ada", quoteNumber: "QTE-2026-014", projectTitle: "Atlas rebrand", lines: LINES, totals: TOTALS, validUntil: DUE, url: URL_UNDER_TEST }) },
    { name: "invoice", email: await invoiceEmail({ clientName: "Ada", number: "INV-2026-014", projectTitle: "Atlas rebrand", lines: LINES, totals: TOTALS, paid: 0, issued: ISSUED, due: DUE, url: URL_UNDER_TEST }) },
    { name: "receipt", email: await receiptEmail({ clientName: "Ada", receiptNumber: "RCP-2026-009", invoiceNumber: "INV-2026-014", amount: 131_687_50, method: "Bank transfer", reference: "TRF-88213", paidAt: DUE, balance: 0, url: URL_UNDER_TEST }) },
    { name: "project stage change", email: projectStageEmail({ clientName: "Ada", projectTitle: "Atlas rebrand", fromStage: "Discovery", toStage: "In progress", note: "Research is signed off and design starts on Monday.", url: URL_UNDER_TEST }) },
    { name: "deliverable ready", email: deliverableReadyEmail({ clientName: "Ada", projectTitle: "Atlas rebrand", deliverable: "The first design route", url: URL_UNDER_TEST, respondBy: DUE }) },
    { name: "sign-off", email: signOffEmail({ clientName: "Ada", projectTitle: "Atlas rebrand", deliverable: "The first design route", signedBy: "Ada Obi", signedAt: DUE, url: URL_UNDER_TEST }) },
    { name: "password reset", email: passwordResetEmail({ name: "Ada", url: URL_UNDER_TEST, expiresInMinutes: 60 }) },
    { name: "sign in", email: signInEmail({ name: "Ada", url: URL_UNDER_TEST, code: "205720", expiresInMinutes: 15 }) },
    /* The one the free tools send. It is the only messages here a stranger
       can cause to be sent without ever talking to us, which is exactly why
       it is held to the same rules as the rest. */
    /* WITH LIGHTHOUSE AND WITHOUT IT ARE DIFFERENT MESSAGES, and the one that
       matters is the degraded one: it is what a reader gets on the day the
       PageSpeed budget is spent, and it still has to read as a report rather
       than as an apology. Both shapes are in the set. */
    { name: "site report", email: siteReportEmail({
      site: "https://example.com/",
      findings: [
        { label: "Meta description", detail: "There is none, so Google picks two lines out of the page." },
        { label: "Sharing tags", detail: "None of the three Open Graph tags are set." },
      ],
      scores: [{ label: "Performance", score: 41 }, { label: "SEO", score: 92 }],
      opportunities: ["Properly size images — about 2.1s faster"],
      url: URL_UNDER_TEST,
    }) },
    { name: "site report, Lighthouse unavailable", email: siteReportEmail({
      site: "https://example.com/",
      findings: [{ label: "Title", detail: "Only 4 characters." }],
      scores: [],
      opportunities: [],
      url: URL_UNDER_TEST,
    }) },
  ];
}

test("every message exists and is a complete HTML document", async () => {
  const all = await everyEmail();
  /* A COUNT RATHER THAN A NAMED NUMBER IN THE TITLE. It said "ten" and the
     tools added three more shapes to the set; a title carrying the count is a
     title that has to be edited by somebody who has already forgotten why. */
  expect(all.length).toBeGreaterThanOrEqual(13);

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
    /* The two with nowhere to send anybody: both are answered by a reply. */
    if (name === "enquiry receipt" || name === "onboarding next steps") continue;
    if (!email.html.includes(URL_UNDER_TEST)) failures.push(`${name}: the URL is missing from the HTML part`);
    if (!email.text.includes(URL_UNDER_TEST)) failures.push(`${name}: the URL is missing from the text part`);
  }
  expect(failures, failures.join("\n")).toEqual([]);
});

/** WCAG relative luminance of a #rrggbb colour. */
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

test("every button is full width, orange, and its white label measures AA", async () => {
  const failures: string[] = [];
  for (const { name, email } of await everyEmail()) {
    /* The bright brand orange is never a fill: white on it is 2.95:1. */
    if (/bgcolor="#ff6500"/i.test(email.html)) failures.push(`${name}: a button is filled #ff6500`);
    for (const match of email.html.matchAll(/<table role="presentation" width="100%"[^>]*><tr><td bgcolor="(#[0-9a-f]{6})"[\s\S]{0,700}?<\/a>/gi)) {
      const [block, fill] = match;
      const label = block.match(/<a [^>]*style="[^"]*color:(#[0-9a-f]{6})/i)?.[1];
      if (!label) continue;
      if (label.toLowerCase() !== "#ffffff") failures.push(`${name}: a button's label is ${label}, not white`);
      if (contrast(fill, label) < 4.5) failures.push(`${name}: label on ${fill} is ${contrast(fill, label).toFixed(2)}:1`);
      if (!/display:block/.test(block)) failures.push(`${name}: the button's anchor does not fill its row`);
      if (!block.includes("/email/arrow-right-white.png")) failures.push(`${name}: the button has no arrow`);
    }
  }
  expect(failures, failures.join("\n")).toEqual([]);
});

test("a message says what it has to and no more", async () => {
  const failures: string[] = [];
  for (const { name, email } of await everyEmail()) {
    /* The button carries the link; a printed copy of it is clutter. */
    if (/copy this address|does not work/i.test(email.html)) failures.push(`${name}: prints a fallback link`);
    if (/letter-spacing:\.14em;text-transform:uppercase/.test(email.html)) failures.push(`${name}: has an eyebrow over the heading`);
    if (!email.html.includes("/email/logo-white.png")) failures.push(`${name}: header has no logo`);
    if (!email.html.includes(">Nigeria<")) failures.push(`${name}: footer has no location`);
    if (!email.html.includes("This email was sent to")) failures.push(`${name}: footer does not say who it was sent to`);
  }
  expect(failures, failures.join("\n")).toEqual([]);
});

test("the footer names the address the message was sent to", () => {
  const email = passwordResetEmail({ name: "Ada", url: URL_UNDER_TEST, expiresInMinutes: 60 });
  expect(email.html).toContain("This email was sent to <span data-wdc-recipient>you</span>.");
  const sent = addressTo(email.html, "ada<x>@example.com");
  expect(sent).toContain("ada&lt;x&gt;@example.com");
  expect(sent).not.toContain("data-wdc-recipient");
});

test("an unsubscribe is offered exactly where one is owed", async () => {
  const owed = new Set(["enquiry receipt", "onboarding next steps", "onboarding reminder", "project stage change"]);
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

test("the onboarding next steps name every channel and keep the account optional", () => {
  const email = onboardingNextStepsEmail({ name: "Ada", service: "SEO" });
  for (const part of [email.text, email.html]) {
    expect(part).toContain("client dashboard");
    expect(part).toContain("WhatsApp project group");
    expect(part).toContain("another channel we agree with you");
    expect(part).toContain("You do not need an account");
  }
  /* No company given means no dangling "for" in the sentence. */
  expect(email.text).not.toMatch(/project for\s*\./);
});

test("no message is hand-built outside the shared frame", () => {
  /* Every email goes through composeEmailHtml or a builder in
     lib/email-templates.ts. A route that writes its own `html:` string is how
     a receipt came to look like a different company from the sign-in link. */
  const root = path.resolve(__dirname, "..");
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry.name) && !full.endsWith("email-templates.ts")) {
        const source = fs.readFileSync(full, "utf8");
        if (!/sendLogged\(|sendMail\(|deliver\(/.test(source)) continue;
        if (/html:\s*[`'"]</.test(source) || /html:\s*\n\s*`</.test(source)) offenders.push(path.relative(root, full));
      }
    }
  };
  for (const dir of ["app", "lib"]) walk(path.join(root, dir));
  expect(offenders, "build these with composeEmailHtml").toEqual([]);
});
