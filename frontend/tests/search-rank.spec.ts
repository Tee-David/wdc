import { expect, test } from "@playwright/test";
import { QUERY_MAX, SEARCH_LIMIT, cleanQuery, likeOf, rankRows, scoreMatch } from "../lib/admin/search-rank";

/**
 * The ranking behind every server-searched picker. Pure: no browser, no
 * database. What it pins is the order a person sees (starts-with first), that
 * email and phone find a client whose company name was not typed, that a
 * query is only ever text, and the 20-row ceiling.
 */

type Client = { id: string; company: string; email: string; phone: string };
const read = (c: Client) => ({ primary: c.company, others: [c.email, c.phone] });

const CLIENTS: Client[] = [
  { id: "1", company: "Hesed Wisdom LLC", email: "ada@hesed.ng", phone: "+234 803 111 2222" },
  { id: "2", company: "Acme Studio", email: "bola@acme.com", phone: "08034445555" },
  { id: "3", company: "Zeta Acme Foods", email: "zed@zeta.com", phone: "" },
  { id: "4", company: "Acme", email: "info@acme.ng", phone: "" },
  { id: "5", company: "Brightside", email: "acme-fan@mail.com", phone: "" },
];

test("what is typed is trimmed, collapsed and capped", () => {
  expect(cleanQuery("  Ada   Obi ")).toBe("Ada Obi");
  expect(cleanQuery(42)).toBe("");
  expect(cleanQuery(undefined)).toBe("");
  expect(cleanQuery("x".repeat(500)).length).toBe(QUERY_MAX);
});

test("starts-with comes before a word start, before a contains, before another field", () => {
  const { rows } = rankRows(CLIENTS, "acme", read);
  expect(rows.map((c) => c.company)).toEqual(["Acme", "Acme Studio", "Zeta Acme Foods", "Brightside"]);
  expect(scoreMatch("acme", "Acme")).toBe(0); // exact
  expect(scoreMatch("acm", "Acme")).toBe(1);
  expect(scoreMatch("acme", "Zeta Acme Foods")).toBe(2);
  expect(scoreMatch("cme", "Acme")).toBe(3);
  expect(scoreMatch("acme", "Brightside", ["acme-fan@mail.com"])).toBe(4);
  expect(scoreMatch("fan", "Brightside", ["acme-fan@mail.com"])).toBe(5);
});

test("a client is found by email or by the digits of a phone, in either form", () => {
  expect(rankRows(CLIENTS, "ada@hesed", read).rows.map((c) => c.id)).toEqual(["1"]);
  expect(rankRows(CLIENTS, "0803 444", read).rows.map((c) => c.id)).toEqual(["2"]);
  expect(rankRows(CLIENTS, "803 111", read).rows.map((c) => c.id)).toEqual(["1"]);
  expect(rankRows(CLIENTS, "+234 803", read).rows.map((c) => c.id).sort()).toEqual(["1"]);
});

test("several words match in any order across the record", () => {
  expect(rankRows(CLIENTS, "wisdom hesed", read).rows.map((c) => c.id)).toEqual(["1"]);
  expect(rankRows(CLIENTS, "wisdom nobody", read).rows).toEqual([]);
});

test("a query is text, never a pattern", () => {
  for (const q of [".*", "(a+", "[", "\\", "%", "_", "a|b", "^Acme$"]) {
    expect(() => rankRows(CLIENTS, q, read)).not.toThrow();
  }
  expect(rankRows(CLIENTS, ".*", read).rows).toEqual([]);
  expect(rankRows(CLIENTS, "%", read).rows).toEqual([]);
  expect(likeOf("50%_off\\", "contains")).toBe("%50\\%\\_off\\\\%");
  expect(likeOf("Ada", "prefix")).toBe("Ada%");
});

test("nothing typed gives the first twenty, and says how many there were", () => {
  const many = Array.from({ length: 57 }, (_, i) => ({ id: String(i), company: `Client ${String(i).padStart(2, "0")}`, email: "", phone: "" }));
  const out = rankRows(many, "", read);
  expect(out.rows).toHaveLength(SEARCH_LIMIT);
  expect(out.total).toBe(57);
  expect(out.rows[0].company).toBe("Client 00");
  const narrowed = rankRows(many, "client 5", read);
  expect(narrowed.rows.length).toBeLessThanOrEqual(SEARCH_LIMIT);
  /* Client 50 to 56 start with it; 05, 15, 25, 35 and 45 only hold both words. */
  expect(narrowed.total).toBe(12);
  expect(narrowed.rows.slice(0, 7).map((c) => c.company)).toEqual(["Client 50", "Client 51", "Client 52", "Client 53", "Client 54", "Client 55", "Client 56"]);
});

test("input order is kept when the caller says so, and results are repeatable", () => {
  const same = [
    { id: "b", company: "Same", email: "", phone: "" },
    { id: "a", company: "Same", email: "", phone: "" },
  ];
  expect(rankRows(same, "same", read, { tie: "input" }).rows.map((c) => c.id)).toEqual(["b", "a"]);
  expect(rankRows(same, "same", read).rows.map((c) => c.id)).toEqual(["b", "a"]); // equal names fall back to input order
  expect(rankRows(CLIENTS, "a", read).rows).toEqual(rankRows(CLIENTS, "a", read).rows);
});
