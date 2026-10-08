/**
 * WHAT AN EXPORT OF THE CONTACT LIST CONTAINS, as plain functions.
 *
 * Pure (no server imports) so the route and the spec share it. The file
 * itself is written by lib/admin/csv.ts (which guards a cell starting with
 * = + - @ against being read as a formula) or lib/xlsx.ts (whose cells are all
 * inline strings, so nothing can become one).
 */

export const EXPORT_COLUMNS = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "type", label: "Type" },
  { key: "status", label: "Status" },
  { key: "tags", label: "Tags" },
  { key: "source", label: "Source" },
  { key: "marketing", label: "Marketing" },
  { key: "opens", label: "Opens" },
  { key: "created", label: "Created" },
] as const;
export type ExportKey = (typeof EXPORT_COLUMNS)[number]["key"];

/** Everything but Opens, which needs a second query and is only wanted sometimes. */
export const DEFAULT_EXPORT_COLS: ExportKey[] = EXPORT_COLUMNS.filter((c) => c.key !== "opens").map((c) => c.key);

export type ExportScope = "filtered" | "selected" | "all";
export type ExportFormat = "csv" | "xlsx";

/** The comma list from the sheet, in the table's own order, unknown names dropped. Empty means the default set. */
export function readCols(value: string | null | undefined, includeStopped = false): ExportKey[] {
  const wanted = new Set((value ?? "").split(",").map((s) => s.trim().toLowerCase()));
  let cols = EXPORT_COLUMNS.filter((c) => wanted.has(c.key)).map((c) => c.key) as ExportKey[];
  if (!cols.length) cols = [...DEFAULT_EXPORT_COLS];
  /* People who asked to stop are included only if they are marked as such. */
  if (includeStopped && !cols.includes("status")) cols = EXPORT_COLUMNS.filter((c) => c.key === "status" || cols.includes(c.key)).map((c) => c.key);
  return cols;
}

export const readScope = (v: string | null | undefined): ExportScope => (v === "selected" || v === "all" ? v : "filtered");
/** "xls" is what the first design called Excel; the file is a real .xlsx either way. */
export const readFormat = (v: string | null | undefined): ExportFormat => (v === "xls" || v === "xlsx" ? "xlsx" : "csv");

export type ExportContact = {
  id: string; name: string; email: string; phone: string; type: string; status: string; marketing: boolean;
  tags: string[]; source: string; createdAt: string;
};

const STATUS: Record<string, string> = { subscribed: "Subscribed", unsubscribed: "Unsubscribed", bounced: "Bounced", complained: "Complained" };

/** Header row first. `opens` is the share of emails sent to each person that they opened, 0 to 100, when known. */
export function exportTable(rows: ExportContact[], cols: ExportKey[], opens: ReadonlyMap<string, number> = new Map()): string[][] {
  const label = (k: ExportKey) => EXPORT_COLUMNS.find((c) => c.key === k)!.label;
  const cell = (c: ExportContact, k: ExportKey): string => {
    switch (k) {
      case "name": return c.name;
      case "email": return c.email;
      case "phone": return c.phone;
      case "type": return c.type;
      case "status": return STATUS[c.status] ?? c.status;
      case "tags": return c.tags.join("; ");
      case "source": return c.source;
      case "marketing": return c.marketing && c.status === "subscribed" ? "yes" : "no";
      case "opens": return opens.has(c.id) ? `${opens.get(c.id)}%` : "";
      case "created": return c.createdAt.slice(0, 10);
    }
  };
  return [cols.map(label), ...rows.map((c) => cols.map((k) => cell(c, k)))];
}
