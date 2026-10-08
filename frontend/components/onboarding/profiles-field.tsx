"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import SelectField from "./select-field";

/**
 * WHERE PEOPLE FIND YOU ONLINE: a website or a social profile per row, with a
 * button for another. The same shape as the colour codes list. Stored as plain
 * lines, "Instagram: https://instagram.com/yourname", so the studio reads it
 * as it is and nothing else has to know about this control.
 */
export const PROFILE_PLATFORMS = ["Website", "Instagram", "Facebook", "X", "TikTok", "LinkedIn", "YouTube", "WhatsApp Business", "Other"];
const MAX_ROWS = 6;

type Row = { platform: string; url: string };

const parse = (value: string): Row[] => {
  const rows = value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
    const at = line.indexOf(": ");
    return at > 0 ? { platform: line.slice(0, at), url: line.slice(at + 2) } : { platform: "", url: line };
  });
  return rows.length ? rows : [{ platform: "", url: "" }];
};
const join = (rows: Row[]) => rows.filter((row) => row.url.trim()).map((row) => `${row.platform || "Link"}: ${row.url.trim()}`).join("\n");

export default function ProfilesField({ id, value, onChange, describedBy }: {
  id: string; value: string; onChange: (value: string) => void; describedBy?: string;
}) {
  const [rows, setRows] = useState<Row[]>(() => parse(value));
  const write = (next: Row[]) => { setRows(next); onChange(join(next)); };
  const set = (index: number, patch: Partial<Row>) => write(rows.map((row, at) => (at === index ? { ...row, ...patch } : row)));

  return (
    <div className="obProf" id={id}>
      <ul className="obProf__list">
        {rows.map((row, index) => (
          <li key={index} className="obProf__row">
            <SelectField id={`${id}-p${index}`} options={PROFILE_PLATFORMS} value={row.platform} placeholder="Where?"
              onChange={(platform) => set(index, { platform })} />
            <input type="text" inputMode="url" autoComplete="off" spellCheck={false} aria-label={`Link ${index + 1}`}
              aria-describedby={describedBy} value={row.url} maxLength={200}
              placeholder={row.platform === "Website" ? "yourbusiness.com" : "Paste the link or @handle"}
              onChange={(event) => set(index, { url: event.target.value })} />
            <button type="button" className="obCol__remove" aria-label={`Remove link ${index + 1}`}
              onClick={() => write(rows.length > 1 ? rows.filter((_, at) => at !== index) : [{ platform: "", url: "" }])}>
              <X aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      {rows.length < MAX_ROWS ? (
        <button type="button" className="ob__btn ob__btn--ghost" onClick={() => setRows([...rows, { platform: "", url: "" }])}>
          <Plus aria-hidden="true" /> Add another
        </button>
      ) : <p className="ob__hint">You can add up to six.</p>}
    </div>
  );
}
