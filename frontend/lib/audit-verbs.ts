/**
 * THE VERB OF AN AUDIT ENTRY, read off the words it was recorded with.
 *
 * Entries store a past-tense phrase a person would say ("issued", "put back
 * to what shipped"). The log's Action column and its filter need a handful of
 * verbs instead, so they are worked out here from the phrase: no new column,
 * no migration, and the same mapping for the table, the filter and the CSV.
 * Order matters: the first match wins, so "unpublished" is tested before
 * "published" and "deleted while still a draft" is a delete.
 */
export const AUDIT_VERBS = [
  { key: "delete", label: "Delete", tone: "bad", re: /\b(delet|remov|anonymis|void|withdr|revers|trash)/i },
  { key: "unpublish", label: "Unpublish", tone: "warn", re: /\b(unpublish|took .* off|off the site|sent back)/i },
  { key: "publish", label: "Publish", tone: "good", re: /\b(publish|put .* back on the site|went live)/i },
  { key: "archive", label: "Archive", tone: "neutral", re: /\barchiv/i },
  { key: "restore", label: "Restore", tone: "good", re: /\b(restor|reopen|put back|reset)/i },
  { key: "create", label: "Create", tone: "brand", re: /\b(creat|added|opened|raised|recorded|uploaded|invited|copied|merged in)/i },
  { key: "send", label: "Send", tone: "live", re: /\b(sent|send|issued|queued a resend|reminded)/i },
  { key: "money", label: "Money", tone: "good", re: /\b(paid|reconciled|put on account|took credit|refund)/i },
  { key: "export", label: "Export", tone: "neutral", re: /\bexport/i },
  { key: "sign-in", label: "Sign-in", tone: "neutral", re: /\b(sign(ed)? (in|out)|password|unlinked google)/i },
  { key: "update", label: "Update", tone: "brand", re: /./ },
] as const;

export type AuditVerb = (typeof AUDIT_VERBS)[number]["key"];

export function verbOf(action: string): (typeof AUDIT_VERBS)[number] {
  return AUDIT_VERBS.find((v) => v.re.test(action)) ?? AUDIT_VERBS[AUDIT_VERBS.length - 1];
}

/**
 * The SQL condition for a verb, with first-match-wins kept: its own pattern
 * and none of the ones before it. Word boundaries are dropped because
 * CockroachDB's regex engine does not know Postgres's \y; the patterns are
 * word stems, so nothing real is lost.
 */
export function verbSql(verb: AuditVerb, column = "action"): { sql: string; patterns: string[] } | null {
  const i = AUDIT_VERBS.findIndex((x) => x.key === verb);
  if (i < 0) return null;
  const src = (n: number) => AUDIT_VERBS[n].re.source.replace(/\\b/g, "");
  const earlier = AUDIT_VERBS.slice(0, i).map((_, n) => src(n));
  const own = AUDIT_VERBS[i].key === "update" ? null : src(i);
  const patterns = [...(own ? [own] : []), ...earlier];
  const parts = patterns.map((_, n) => `${n === 0 && own ? "" : "NOT "}${column} ~* $$${n}`);
  return { sql: `(${parts.join(" AND ") || "TRUE"})`, patterns };
}
