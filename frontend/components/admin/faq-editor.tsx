"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import type { Faq } from "@/lib/faq";
import { FAQ_LIMITS } from "@/lib/faq-validate";
import { resetFaqs, saveFaqs } from "@/lib/admin/content-actions";
import { Actions, Form, Hidden, Submit } from "./form";

type Row = Faq & { key: number };
let seq = 0;

/**
 * The FAQ, one question at a time, in the order it is shown.
 *
 * A question tagged to services appears on those service pages first; an
 * untagged one applies everywhere. That is the rule `faqsFor` already uses, so
 * the tags here mean exactly what they do on the site.
 */
export function FaqEditor({ initial, services, edited }: {
  initial: Faq[];
  services: { value: string; label: string }[];
  edited: boolean;
}) {
  const [rows, setRows] = useState<Row[]>(() => initial.map((f) => ({ ...f, key: ++seq })));
  const set = (i: number, patch: Partial<Faq>) => setRows((all) => all.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const move = (i: number, by: number) => setRows((all) => {
    const next = [...all];
    const [r] = next.splice(i, 1);
    next.splice(i + by, 0, r);
    return next;
  });

  return (
    <>
      <Form action={saveFaqs} className="adBlog">
        <Hidden name="faqs" value={JSON.stringify(rows.map((r) => ({ q: r.q, a: r.a, ...(r.services?.length ? { services: r.services } : {}) })))} />
        <ol className="adBlog__list">
          {rows.map((r, i) => (
            <li key={r.key} className="adBlog__block">
              <div className="adBlog__blockBar">
                <b>Question {i + 1}</b>
                <span className="adBlog__tools">
                  <button type="button" className="ad__btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move question ${i + 1} up`}><ArrowUp aria-hidden="true" /></button>
                  <button type="button" className="ad__btn" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label={`Move question ${i + 1} down`}><ArrowDown aria-hidden="true" /></button>
                  <button type="button" className="ad__btn" onClick={() => setRows((all) => all.filter((_, j) => j !== i))} disabled={rows.length === 1} aria-label={`Remove question ${i + 1}`}><Trash2 aria-hidden="true" /></button>
                </span>
              </div>
              <input aria-label={`Question ${i + 1}`} value={r.q} maxLength={FAQ_LIMITS.q} onChange={(e) => set(i, { q: e.target.value })} />
              <textarea aria-label={`Answer ${i + 1}`} rows={4} value={r.a} maxLength={FAQ_LIMITS.a} onChange={(e) => set(i, { a: e.target.value })} />
              <fieldset className="adBlog__tags">
                <legend className="ad__dim">Shown first on (none means every service page)</legend>
                {services.map((s) => (
                  <label key={s.value} className="ad__check">
                    <input type="checkbox" checked={r.services?.includes(s.value as never) ?? false}
                           onChange={(e) => set(i, {
                             services: e.target.checked
                               ? [...(r.services ?? []), s.value as never]
                               : (r.services ?? []).filter((x) => x !== s.value),
                           })} />
                    <span>{s.label}</span>
                  </label>
                ))}
              </fieldset>
            </li>
          ))}
        </ol>
        <div className="adBlog__add">
          <button type="button" className="ad__btn" disabled={rows.length >= FAQ_LIMITS.items}
                  onClick={() => setRows((all) => [...all, { q: "", a: "", key: ++seq }])}>
            <Plus aria-hidden="true" /> Add a question
          </button>
        </div>
        <Actions>
          <Submit icon={Save}>Save the FAQ</Submit>
        </Actions>
      </Form>
      {edited ? (
        <Form action={resetFaqs} confirm="Put back the questions that shipped with the site? Your edits are replaced.">
          <Actions>
            <Submit tone="plain" icon={RotateCcw}>Reset to what shipped</Submit>
          </Actions>
        </Form>
      ) : null}
    </>
  );
}
