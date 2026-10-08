import { expect, test } from "@playwright/test";
import { MAX_ROWS, checkRows, countBy, parseCSV, parseImport, phoneKey, sampleCsv, type Lookups, type ParsedRow } from "../lib/contacts-import";
import { exportTable, readCols, readFormat, readScope, type ExportContact } from "../lib/contacts-export";
import { csvBody, csvCell } from "../lib/admin/csv";

/**
 * The rules of the Contacts import and export (lib/contacts-import.ts,
 * lib/contacts-export.ts). Pure functions, so no browser and no database: what
 * the import route decides about each row, and what the export writes into each
 * cell, are the same functions these call.
 */

const none: Lookups = { stopped: new Set(), existing: new Set(), phones: new Map() };
const rowsOf = (csv: string): ParsedRow[] => {
  const p = parseImport(csv);
  if ("error" in p) throw new Error(p.error);
  return p.rows;
};

test("a CSV is read with quotes, a BOM, CRLF and tab separators", () => {
  expect(parseCSV('﻿email,name\r\na@x.co,"Obi, Ada"\r\n\r\nb@x.co,"say ""hi"""\r\n')).toEqual([["email", "name"], ["a@x.co", "Obi, Ada"], ["b@x.co", 'say "hi"']]);
  expect(parseCSV("email\tname\na@x.co\tAda")).toEqual([["email", "name"], ["a@x.co", "Ada"]]);
  /* A semicolon is the tag separator inside a cell, never a column separator. */
  expect(parseCSV("email,tags\na@x.co,client;web")[1]).toEqual(["a@x.co", "client;web"]);
});

test("the file is refused before any row is looked at when it cannot be read", () => {
  expect(parseImport("")).toEqual({ error: "That file is empty." });
  expect(parseImport("name,phone\nAda,1")).toEqual({ error: "The first row must have a column named email." });
  expect(parseImport("email,name\n")).toEqual({ error: "The file has no rows under the header." });
  const big = `email\n${Array.from({ length: MAX_ROWS + 1 }, (_, i) => `p${i}@example.com`).join("\n")}`;
  expect("error" in parseImport(big) && parseImport(big)).toMatchObject({ error: expect.stringContaining("5,000") });
  expect(parseImport(`email\n${Array.from({ length: MAX_ROWS }, (_, i) => `p${i}@example.com`).join("\n")}`)).toHaveProperty("rows");
  expect(parseImport("email\na@example.com", 2 * 1024 * 1024 + 1)).toMatchObject({ error: expect.stringContaining("2 MB") });
});

test("cells are normalised: tags split on semicolons, headers aliased, our own CSV guard undone", () => {
  const [r] = rowsOf("E-mail,Full Name,Mobile,Tag,Marketing,Source\n  Ada@Example.COM ,Ada,'+234 803 555 0142,Client; Web ;client;;,YES,Newsletter form");
  expect(r).toMatchObject({ n: 2, email: "ada@example.com", name: "Ada", phone: "+234 803 555 0142", tags: ["client", "web"], marketing: true, source: "Newsletter form" });
  expect(rowsOf("email,marketing\na@example.com,\nb@example.com,maybe").map((x) => x.marketing)).toEqual([false, null]);
});

test("every row gets exactly one verdict, and the refusals say why", () => {
  const csv = [
    "email,name,phone,tags,marketing,source",
    "good@example.com,Good,,lead,no,Contact page",
    "not-an-email,Broken,,lead,no,",
    ",Nobody,,,no,",
    "temp@mailinator.com,Temp,,lead,no,Contact page",
    "me@proton.me,Private,,lead,no,",
    "good@example.com,Again,,lead,no,",
    "gone@example.com,Gone,,newsletter,yes,Newsletter form",
    "nosrc@example.com,No Source,,newsletter,yes,",
    "odd@example.com,Odd,,x,perhaps,Form",
    "kemi@example.com,Kemi,,lead;brand,no,Contact page",
    "ada@example.com,Ada,0803 555 0142,client,yes,Newsletter form",
    "phone2@example.com,Phone Two,+234 805 555 0111,lead,yes,Event",
    "phone3@example.com,Phone Three,+234 809 555 0190,lead,no,",
  ].join("\n");
  const look: Lookups = {
    stopped: new Set(["gone@example.com", "holder@example.com"]),
    existing: new Set(["kemi@example.com"]),
    phones: new Map([[phoneKey("+234 805 555 0111"), "holder@example.com"], [phoneKey("2348095550190"), "old@example.com"]]),
  };
  const out = checkRows(rowsOf(csv), look);
  const by = (email: string) => out.find((r) => r.email === email && r.verdict !== "refused") ?? out.find((r) => r.email === email)!;
  expect(out).toHaveLength(13);
  expect(out.find((r) => r.email === "not-an-email")).toMatchObject({ verdict: "refused", why: "Not a valid email" });
  expect(out.find((r) => r.n === 4)).toMatchObject({ verdict: "refused", why: "No email on this row" });
  expect(out.find((r) => r.email === "temp@mailinator.com")).toMatchObject({ verdict: "refused", why: "Temporary or anonymous inbox" });
  expect(out.find((r) => r.email === "me@proton.me")?.verdict).toBe("refused");
  expect(by("good@example.com")).toMatchObject({ verdict: "new", n: 2 });
  expect(out.find((r) => r.n === 7)).toMatchObject({ verdict: "refused", why: "Appears twice in the file (first on row 2)" });
  expect(out.find((r) => r.email === "gone@example.com")).toMatchObject({ verdict: "refused", why: "Asked to stop, never added back" });
  expect(out.find((r) => r.email === "nosrc@example.com")).toMatchObject({ verdict: "refused", why: "Marketing yes needs a source (how they agreed)" });
  expect(out.find((r) => r.email === "odd@example.com")).toMatchObject({ verdict: "refused", why: "marketing must be yes or no" });
  expect(by("kemi@example.com")).toMatchObject({ verdict: "update", why: "Already a contact, will be updated" });
  /* An existing number is the same person: updated, the file's address is not stored, and its consent does not carry over. */
  expect(by("phone3@example.com")).toMatchObject({ verdict: "update", matchedEmail: "old@example.com", marketing: false });
  /* ...unless that person asked to stop, in which case the number does not bring them back under a new address. */
  expect(out.find((r) => r.email === "phone2@example.com")).toMatchObject({ verdict: "refused", why: "Same phone number as someone who asked to stop" });
  expect(by("ada@example.com")).toMatchObject({ verdict: "new", marketing: true });
  expect([countBy(out, "new"), countBy(out, "update"), countBy(out, "refused")]).toEqual([2, 2, 9]);
});

test("phone numbers match on their last ten digits, however they are written", () => {
  expect(phoneKey("+234 803 555 0142")).toBe(phoneKey("0803 555 0142"));
  expect(phoneKey("123")).toBe("");
});

test("the sample file is the header and three rows, and every row in it is importable", () => {
  const csv = sampleCsv();
  expect(csv.startsWith("﻿email,name,phone,tags,marketing,source\r\n")).toBe(true);
  expect(parseCSV(csv)).toHaveLength(4);
  const out = checkRows(rowsOf(csv), none);
  expect(out.map((r) => r.verdict)).toEqual(["new", "new", "new"]);
  expect(out.map((r) => r.marketing)).toEqual([true, false, true]);
});

const person = (over: Partial<ExportContact>): ExportContact => ({
  id: "c1", name: "Ada Obi", email: "ada@example.com", phone: "+234 803 555 0142", type: "client", status: "subscribed", marketing: true,
  tags: ["client", "web"], source: "newsletter, footer", createdAt: "2026-03-04T09:00:00.000Z", ...over,
});

test("a cell that starts with = + - or @ is made inert in a CSV, and the file still imports back", () => {
  for (const bad of ["=HYPERLINK(\"http://x\")", "+SUM(1)", "-2+3", "@cmd", "\t=1"]) {
    expect(csvCell(bad).startsWith(`"'`), bad).toBe(true);
  }
  expect(csvCell("Ada")).toBe('"Ada"');
  const table = exportTable([person({ name: '=HYPERLINK("http://evil")', source: "@import", tags: ["-x"] })], readCols(null));
  const csv = csvBody(table);
  expect(csv).toContain(`"'=HYPERLINK(""http://evil"")"`);
  expect(csv).toContain(`"'@import"`);
  /* Phone numbers start with a plus, so they are guarded too; reading the file back undoes it. */
  expect(csv).toContain(`"'+234 803 555 0142"`);
  const back = rowsOf(csv);
  expect(back[0]).toMatchObject({ email: "ada@example.com", phone: "+234 803 555 0142", marketing: true, name: '=HYPERLINK("http://evil")', source: "@import" });
});

test("export columns: the chosen ones in table order, and a stopped person is always marked", () => {
  expect(readCols("email,name")).toEqual(["name", "email"]);
  expect(readCols("nonsense,")).toEqual(readCols(null));
  expect(readCols(null)).not.toContain("opens");
  expect(readCols("email", true)).toEqual(["email", "status"]);
  const stopped = person({ id: "c2", status: "unsubscribed", marketing: false, email: "gone@example.com" });
  const t = exportTable([person({}), stopped], ["email", "status", "marketing", "opens"], new Map([["c1", 46]]));
  expect(t).toEqual([["Email", "Status", "Marketing", "Opens"], ["ada@example.com", "Subscribed", "yes", "46%"], ["gone@example.com", "Unsubscribed", "no", ""]]);
  expect(readScope("selected")).toBe("selected");
  expect(readScope("everything")).toBe("filtered");
  expect(readFormat("xls")).toBe("xlsx");
  expect(readFormat("csv")).toBe("csv");
  expect(readFormat(null)).toBe("csv");
});
