"use client";

import { Fragment } from "react";
import {
  Check, Columns2, Hash, Heading1, Image as ImageIcon, Info, Lock, MousePointerClick, Minus, MoveVertical, Plus, RotateCcw, Table2, Trash2, Type, TriangleAlert,
} from "lucide-react";
import { BLOCK_LABEL, fillTags, splitTags, tagUses, type Block, type Design } from "@/lib/email-design";
import type { Tag } from "@/lib/email-registry";
import { Pick } from "../pick";

/* The side panel: Blocks, Tags, Settings, Checklist. Pure presentation over the builder's state. */

export const ADDABLE: Block["type"][] = ["heading", "text", "button", "facts", "figure", "image", "columns", "divider", "space", "note"];
const ICON: Record<string, React.ComponentType<{ "aria-hidden"?: boolean | "true" | "false" }>> = {
  heading: Heading1, text: Type, button: MousePointerClick, facts: Table2, figure: Hash, image: ImageIcon,
  columns: Columns2, divider: Minus, space: MoveVertical, note: Info,
};

/** A string with its merge tags drawn as chips (for the parts of a block that are edited in Settings). */
export function Chips({ text, empty }: { text: string; empty?: string }) {
  const parts = splitTags(text);
  if (!text.trim()) return <>{empty ?? ""}</>;
  return <>{parts.map((p, i) => (typeof p === "string" ? <Fragment key={i}>{p}</Fragment> : <span key={i} className="eb-mt eb-mt--static" title={p.fallback ? `Fallback: ${p.fallback}` : undefined}>{p.key}</span>))}</>;
}

/* ------------------------------------------------------------------ scans */

/** Text that people read, where an empty tag leaves a hole in a sentence. */
function wordsOf(d: Design): string[] {
  const out = [d.subject, d.heading];
  for (const b of d.blocks) if (b.type === "heading" || b.type === "text" || b.type === "note") out.push(b.text); else if (b.type === "columns") out.push(b.left, b.right);
  return out;
}
/** Every string in the design, for tags that are not known. */
function everything(d: Design): string[] {
  const out = [d.subject, d.preheader, d.heading];
  for (const b of d.blocks) {
    out.push(...Object.values(b).filter((v): v is string => typeof v === "string"));
    if (b.type === "facts") for (const r of b.rows) out.push(r.label, r.value);
  }
  return out;
}
export function tagReport(d: Design, known: Set<string>) {
  const used = new Map<string, boolean>(); // key -> has a fallback everywhere it is used in words
  const noFallback = new Set<string>();
  for (const t of wordsOf(d)) for (const u of tagUses(t)) {
    used.set(u.key, (used.get(u.key) ?? true) && u.fallback !== undefined);
    if (u.fallback === undefined) noFallback.add(u.key);
  }
  const unknown = new Set<string>();
  for (const t of everything(d)) for (const u of tagUses(t)) { if (!used.has(u.key)) used.set(u.key, true); if (!known.has(u.key)) unknown.add(u.key); }
  return { used, noFallback: [...noFallback], unknown: [...unknown] };
}

/* ------------------------------------------------------------------ blocks */

export function BlocksPane({ add, tileDown, full }: {
  add: (t: Block["type"]) => void;
  tileDown: (e: React.PointerEvent, t: Block["type"]) => void;
  full: boolean;
}) {
  return (
    <>
      <h4>Add a block</h4>
      <div className="eb-tiles">
        {ADDABLE.map((t) => {
          const I = ICON[t];
          return (
            <button key={t} type="button" className="eb-tile" disabled={full} onClick={() => add(t)} onPointerDown={(e) => tileDown(e, t)}>
              <span className="eb-ti"><I aria-hidden="true" /></span><span>{BLOCK_LABEL[t]}</span>
            </button>
          );
        })}
      </div>
      <p className="eb-hint">{full ? "An email can hold 60 blocks. Remove one to add another." : "Drag a block onto the email, or press it to add it at the end."}</p>
    </>
  );
}

/* -------------------------------------------------------------------- tags */

export function TagsPane({ design, tags, known, put }: { design: Design; tags: Tag[]; known: Set<string>; put: (key: string) => void }) {
  const r = tagReport(design, known);
  const label = (k: string) => tags.find((t) => t.key === k)?.label ?? k;
  return (
    <>
      <h4>Used in this email</h4>
      {r.used.size ? [...r.used].map(([k, fb]) => (
        <div key={k} className="eb-trow">
          <span>{label(k)}{known.has(k) ? (fb ? "" : " (no fallback)") : " (not a tag here)"}</span><code>{k}</code>
        </div>
      )) : <p className="eb-hint">No merge tags yet. Use Merge tag in the toolbar.</p>}
      {r.unknown.length ? <p className="eb-warn" role="alert">Not a tag here: {r.unknown.map((u) => `{{${u}}}`).join(", ")}. It will be left empty.</p> : null}
      <h4>Available tags</h4>
      {tags.map((t) => (
        <button key={t.key} type="button" className="eb-trow eb-trow--btn" onClick={() => put(t.key)} title={`Example: ${t.sample}`}>
          <span>{t.label}</span><code>{t.key}</code>
        </button>
      ))}
      <p className="eb-hint">Press one to put it where your cursor is. Press a tag in the email to give it a fallback: the words used when a person has no value.</p>
    </>
  );
}

/* --------------------------------------------------------------- checklist */

export function ChecklistPane({ design, sample, known, unsubscribe, why }: {
  design: Design; sample: Record<string, string>; known: Set<string>; unsubscribe?: boolean; why?: string;
}) {
  const subject = fillTags(design.subject, sample).replace(/\s+/g, " ").trim();
  const r = tagReport(design, known);
  const pics = design.blocks.filter((b) => b.type === "image" && b.src.length > 8);
  const long = design.blocks.filter((b) => Object.values(b).some((v) => typeof v === "string" && v.length > 3900));
  const items: { ok: boolean; text: string }[] = [
    { ok: subject.length > 0 && subject.length <= 60, text: !subject.length ? "Add a subject" : `Subject is ${subject.length} characters${subject.length > 60 ? ", which may be cut off on a phone" : ""}` },
    { ok: design.blocks.some((b) => b.type === "button"), text: design.blocks.some((b) => b.type === "button") ? "Has a clear button" : "No button yet. One clear next step gets more replies" },
    ...(unsubscribe === undefined ? [] : [{ ok: true, text: unsubscribe ? "An unsubscribe link and the reason for getting it are added at the foot" : `No unsubscribe link: ${why ?? "it answers something the person did"}` }]),
    { ok: r.noFallback.length === 0, text: r.noFallback.length ? `No fallback for ${r.noFallback.map((k) => `{{${k}}}`).join(", ")}. Press the tag to add one` : "Every merge tag in the words has a fallback" },
    { ok: r.unknown.length === 0, text: r.unknown.length ? `Not a tag here: ${r.unknown.map((k) => `{{${k}}}`).join(", ")}` : "Every merge tag is one this email can fill" },
    ...(pics.length ? [{ ok: pics.every((b) => b.type === "image" && b.alt.trim()), text: pics.every((b) => b.type === "image" && b.alt.trim()) ? "Pictures have a description" : "A picture has no description" }] : []),
    { ok: long.length === 0, text: long.length ? "A block is close to the 4,000 character limit and may be cut when saved" : "Every block fits what can be saved" },
  ];
  return (
    <>
      <h4>Before you switch it on</h4>
      {items.map((c, i) => (
        <div key={i} className={`eb-chk ${c.ok ? "is-ok" : "is-no"}`}>
          <i aria-hidden="true">{c.ok ? <Check /> : <TriangleAlert />}</i>
          <span><span className="ad__sr">{c.ok ? "Done: " : "Needs attention: "}</span>{c.text}</span>
        </div>
      ))}
      <p className="eb-hint">The plain-text version and the preview line are made for you.</p>
    </>
  );
}

/* ---------------------------------------------------------------- settings */

const WHEN = [
  { value: "", label: "Always" },
  { value: "filled", label: "Contact has the tag" },
  { value: "empty", label: "Contact does not have the tag" },
];

export function SettingsPane({ sel, patch, design, setMeta, campaign, history, tags, put, enabled, exists, busy, restore, reset }: {
  sel: Block | null;
  patch: (id: string, p: Partial<Block>, key?: string) => void;
  design: Design;
  setMeta: (p: Partial<Design>, key: string) => void;
  campaign: boolean;
  history: { id: string; savedBy: string; savedAt: string }[];
  tags: Tag[]; put: (key: string) => void;
  enabled: boolean; exists: boolean; busy: boolean;
  restore: (id: string) => void; reset: () => void;
}) {
  const field = (b: Block, label: string, name: string, value: string, max = 500, area = false) => (
    <label className="eb-f">{label}
      {area
        ? <textarea rows={3} value={value} maxLength={max} onChange={(e) => patch(b.id, { [name]: e.target.value } as Partial<Block>, `s:${b.id}:${name}`)} />
        : <input value={value} maxLength={max} onChange={(e) => patch(b.id, { [name]: e.target.value } as Partial<Block>, `s:${b.id}:${name}`)} />}
    </label>
  );
  /* The words on these blocks are typed here, so a tag is dropped into the field being edited. */
  const tagPick = (
    <Pick label="Put a merge tag in the field you are editing" placeholder="Insert a merge tag…" value=""
      options={tags.map((t) => ({ value: t.key, label: `${t.label} (${t.key})` }))} search={tags.length > 10}
      onChange={(k) => { if (k) put(k); }} />
  );
  const edit = (b: Block) => {
    switch (b.type) {
      case "button": return <>{field(b, "Label", "label", b.label, 80)}{field(b, "Link", "url", b.url, 500)}<div className="eb-tagpick">{tagPick}</div></>;
      case "figure": return <>{field(b, "Label", "label", b.label, 80)}{field(b, "Value", "value", b.value, 80)}{field(b, "Note under it", "note", b.note, 160)}<div className="eb-tagpick">{tagPick}</div></>;
      case "image": return <>{field(b, "Picture address (https)", "src", b.src)}{field(b, "Describe it", "alt", b.alt, 200)}{field(b, "Link when pressed (optional)", "url", b.url)}<div className="eb-tagpick">{tagPick}</div></>;
      case "space": return (
        <label className="eb-f">Height ({b.size}px)
          <input type="range" min={4} max={80} value={b.size} onChange={(e) => patch(b.id, { size: Number(e.target.value) } as Partial<Block>, `s:${b.id}:size`)} />
        </label>
      );
      case "facts": return (
        <div className="eb-rows">
          {b.rows.map((r, i) => (
            <div key={i} className="eb-row2">
              <input aria-label={`Row ${i + 1} label`} value={r.label} maxLength={80} onChange={(e) => patch(b.id, { rows: b.rows.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)) } as Partial<Block>, `s:${b.id}:l${i}`)} />
              <input aria-label={`Row ${i + 1} value`} value={r.value} maxLength={300} onChange={(e) => patch(b.id, { rows: b.rows.map((x, k) => (k === i ? { ...x, value: e.target.value } : x)) } as Partial<Block>, `s:${b.id}:v${i}`)} />
              <button type="button" className="eb-ib" onClick={() => patch(b.id, { rows: b.rows.filter((_, k) => k !== i) } as Partial<Block>)} aria-label={`Remove row ${i + 1}`}><Trash2 aria-hidden="true" /></button>
            </div>
          ))}
          {b.rows.length < 8 ? <button type="button" className="ad__btn" onClick={() => patch(b.id, { rows: [...b.rows, { label: "", value: "" }] } as Partial<Block>)}><Plus aria-hidden="true" /> Row</button> : null}
          <div className="eb-tagpick">{tagPick}</div>
        </div>
      );
      case "system": return <p className="eb-lock"><Lock aria-hidden="true" /> Filled in by the studio when it is sent. You can move it or remove it.</p>;
      case "divider": return <p className="eb-hint">A thin line. It has no settings.</p>;
      default: return <p className="eb-hint">Write this one on the email itself. Select text to format it.</p>;
    }
  };
  const when = sel?.when;
  const plainTag = when?.key.startsWith("tag.");
  return (
    <>
      {sel ? (
        <>
          <h4>{BLOCK_LABEL[sel.type]} block</h4>
          {edit(sel)}
          {sel.type !== "system" ? (
            <>
              <h4>Show only if</h4>
              <Pick label="Show this block" options={WHEN} value={when?.is ?? ""}
                onChange={(v) => patch(sel.id, { when: v ? { key: when?.key ?? "tag.client", is: v as "filled" | "empty" } : undefined } as Partial<Block>)} />
              {when ? (
                <label className="eb-f eb-f--tag">{plainTag ? "Tag name" : "Value to check"}
                  <span className="eb-pre">
                    {plainTag ? <span aria-hidden="true">tag.</span> : null}
                    <input value={plainTag ? when.key.slice(4) : when.key} maxLength={56} placeholder="client"
                      onChange={(e) => patch(sel.id, { when: { key: plainTag ? `tag.${e.target.value.trim()}` : e.target.value.trim(), is: when.is } } as Partial<Block>, `w:${sel.id}`)} />
                  </span>
                </label>
              ) : null}
              <p className="eb-hint">A block with a condition is left out of the email for everyone it does not fit. A person&apos;s tags are values named tag.name.</p>
            </>
          ) : null}
        </>
      ) : <p className="eb-hint">Select a block in the email to change its settings.</p>}

      <h4>This email</h4>
      <label className="eb-f">Preview line
        <input value={design.preheader} maxLength={200} onChange={(e) => setMeta({ preheader: e.target.value }, "preheader")} />
        <small>The grey text after the subject in an inbox.</small>
      </label>

      {campaign ? null : (
        <>
          <h4>Versions</h4>
          {history.length ? (
            <ul className="eb-hist">
              {history.map((h) => (
                <li key={h.id}>
                  <span>{new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" }).format(new Date(h.savedAt))} by {h.savedBy || "someone"}</span>
                  <button type="button" className="ad__btn" onClick={() => restore(h.id)} disabled={busy}>Load</button>
                </li>
              ))}
            </ul>
          ) : <p className="eb-hint">Every save is kept here, so you can go back.</p>}
          {exists ? (
            <div className="eb-reset">
              <button type="button" className="ad__btn ad__btn--danger" onClick={reset} disabled={busy}><RotateCcw aria-hidden="true" /> Reset to built-in</button>
              <p className="eb-hint">{enabled ? "Deletes your design and sends the built-in one again." : "Deletes your saved design."}</p>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
