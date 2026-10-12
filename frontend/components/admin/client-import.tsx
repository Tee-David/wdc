"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { importClients } from "@/lib/admin/client-import-actions";
import { Actions, Form, Hidden, Submit } from "./form";

/**
 * THE IMPORT SHEET: choose a CSV, see what it holds, then add it. The file is
 * read in the browser (nothing is uploaded until Add), the header row is
 * matched by name (Business name or Company, Main contact or Name, Email,
 * Phone, Sector, Services) and the first rows are shown so a wrong column is
 * seen before it is saved. The server re-checks every row.
 */
type Row = { company: string; name: string; email: string; phone: string; sector: string; services: string };

function parseCsv(src: string): string[][] {
  const out: string[][] = []; let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (q) { if (ch === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && src[i + 1] === "\n") i++; row.push(cell); out.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); out.push(row); }
  return out.filter((r) => r.some((c) => c.trim()));
}

const HEADS: Record<keyof Row, string[]> = {
  company: ["business name", "company", "business", "client"], name: ["main contact", "contact", "name", "who you deal with"],
  email: ["email", "email address"], phone: ["phone", "telephone", "mobile"], sector: ["sector", "industry"], services: ["services", "service", "what they buy"],
};

export function ImportClientsBody({ close }: { close?: () => void }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [note, setNote] = useState("");
  const read = async (file: File | undefined) => {
    setRows(null); setNote("");
    if (!file) return;
    if (file.size > 1_000_000) { setNote("That file is over 1 MB. Split it and import in parts."); return; }
    const grid = parseCsv((await file.text()).replace(/^﻿/, ""));
    const head = (grid[0] ?? []).map((h) => h.trim().toLowerCase());
    const at = (k: keyof Row) => head.findIndex((h) => HEADS[k].includes(h));
    if (at("company") < 0 || at("email") < 0) { setNote("The first row needs a Company (or Business name) column and an Email column."); return; }
    const list = grid.slice(1).map((r) => Object.fromEntries((Object.keys(HEADS) as (keyof Row)[]).map((k) => [k, at(k) < 0 ? "" : (r[at(k)] ?? "").trim()])) as Row);
    if (!list.length) { setNote("The file has a header row and nothing under it."); return; }
    if (list.length > 300) { setNote("Add up to 300 clients at a time. Split the file and import it in parts."); return; }
    setRows(list);
  };
  return (
    <Form action={importClients} onDone={() => close?.()}>
      <p className="ad__dim" style={{ margin: "0 0 .75rem" }}>
        Choose a CSV with a header row. Columns we read: Business name, Main contact, Email, Phone, Sector, Services. Clients who already exist by email or phone are skipped, so nobody gets a second record.
      </p>
      <label className="ad__btn" style={{ cursor: "pointer" }}>
        <Upload aria-hidden="true" />Choose a CSV file
        <input type="file" accept=".csv,text/csv" className="ad__sr" onChange={(e) => void read(e.target.files?.[0])} />
      </label>
      {note ? <p className="ad__msg is-bad" role="status" style={{ marginTop: ".75rem" }}>{note}</p> : null}
      {rows ? (
        <>
          <p style={{ margin: ".9rem 0 .4rem", fontWeight: 600 }}>{rows.length} {rows.length === 1 ? "row" : "rows"} ready. First {Math.min(5, rows.length)}:</p>
          <div className="ad__scroll" tabIndex={0} role="region" aria-label="Preview of the first rows" data-lenis-prevent>
            <table className="ad__t"><thead><tr><th>Business</th><th>Contact</th><th>Email</th></tr></thead>
              <tbody>{rows.slice(0, 5).map((r, i) => <tr key={i}><td>{r.company || <span className="ad__dim">Missing</span>}</td><td>{r.name}</td><td>{r.email || <span className="ad__dim">Missing</span>}</td></tr>)}</tbody>
            </table>
          </div>
          <Hidden name="rows" value={JSON.stringify(rows)} />
        </>
      ) : null}
      <Actions>
        <Submit icon={Upload} disabled={!rows}>Add {rows ? rows.length : ""} {rows?.length === 1 ? "client" : "clients"}</Submit>
        {!rows ? <p className="adWhy">Choose a file to see what it holds.</p> : null}
      </Actions>
    </Form>
  );
}
