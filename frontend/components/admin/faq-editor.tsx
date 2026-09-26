"use client";

import { useId, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, ChevronDown, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import type { Faq } from "@/lib/faq";
import { FAQ_LIMITS } from "@/lib/faq-validate";
import { resetFaqs, saveFaqs } from "@/lib/admin/content-actions";
import { Actions, Form, Hidden, Submit } from "./form";
import { ask } from "./confirm";
import "./faq-editor.css";

type Row = Faq & { key: number; open: boolean };

/**
 * The FAQ, one question at a time, in the order it is shown.
 *
 * A question tagged to services appears on those service pages first; an
 * untagged one applies everywhere. That is the rule `faqsFor` already uses, so
 * the tags here mean exactly what they do on the site.
 *
 * A LIST OF CARDS THAT OPEN ONE AT A TIME. Closed, a card is the question and
 * where it shows, so forty questions fit on a phone and can be read in order.
 * Open, it is the two fields, the service chips and one row of tools (up,
 * down, remove) at 44px, instead of the three full-width buttons stacked above
 * every question that the borrowed blog-editor classes used to give it.
 */
export function FaqEditor({ initial, services, edited }: {
  initial: Faq[];
  services: { value: string; label: string }[];
  edited: boolean;
}) {
  /* Keys from position for what the server rendered, so the ids below match
     on hydration; only rows added here count on from there. */
  const [rows, setRows] = useState<Row[]>(() => initial.map((f, i) => ({ ...f, key: i, open: false })));
  const seq = useRef(initial.length);
  const uid = useId();
  const set = (i: number, patch: Partial<Row>) => setRows((all) => all.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const move = (i: number, by: number) => setRows((all) => {
    const next = [...all];
    const [r] = next.splice(i, 1);
    next.splice(i + by, 0, r);
    return next;
  });
  const label = (v: string) => services.find((s) => s.value === v)?.label ?? v;
  const remove = async (i: number) => {
    const q = rows[i]?.q.trim();
    if (await ask(`Remove question ${i + 1}? ${q ? `“${q.slice(0, 80)}” ` : ""}comes off the FAQ when you save. Until then, leaving the page keeps it.`, { verb: "Remove" })) {
      setRows((all) => all.filter((_, j) => j !== i));
    }
  };

  return (
    <>
      <Form action={saveFaqs} className="adFaq">
        <Hidden name="faqs" value={JSON.stringify(rows.map((r) => ({ q: r.q, a: r.a, ...(r.services?.length ? { services: r.services } : {}) })))} />
        <p className="adFaq__count ad__dim">{rows.length} question{rows.length === 1 ? "" : "s"}, in the order the site shows them. Tap one to edit it.</p>
        <ol className="adFaq__list">
          {rows.map((r, i) => (
            <li key={r.key} className={`adFaq__item${r.open ? " is-open" : ""}`}>
              <button type="button" className="adFaq__head" aria-expanded={r.open} aria-controls={`${uid}-${r.key}`} onClick={() => set(i, { open: !r.open })}>
                <span className="adFaq__num" aria-hidden="true">{i + 1}</span>
                <span className="adFaq__sum">
                  <b>{r.q.trim() || "New question"}</b>
                  <small>{r.services?.length ? r.services.map(label).join(", ") : "Every service page"}</small>
                </span>
                <ChevronDown className="adFaq__chev" aria-hidden="true" />
              </button>
              {r.open ? (
                <div className="adFaq__body" id={`${uid}-${r.key}`}>
                  <label className="adFaq__field">
                    <span>Question <i>{r.q.length}/{FAQ_LIMITS.q}</i></span>
                    <input value={r.q} maxLength={FAQ_LIMITS.q} placeholder="What people ask, in their words" onChange={(e) => set(i, { q: e.target.value })} />
                  </label>
                  <label className="adFaq__field">
                    <span>Answer <i>{r.a.length}/{FAQ_LIMITS.a}</i></span>
                    <textarea rows={5} value={r.a} maxLength={FAQ_LIMITS.a} placeholder="The answer, as you would say it on a call" onChange={(e) => set(i, { a: e.target.value })} />
                  </label>
                  <fieldset className="adFaq__chips">
                    <legend>Shown first on <span className="ad__dim">(none picked means every service page)</span></legend>
                    {services.map((s) => {
                      const on = r.services?.includes(s.value as never) ?? false;
                      return (
                        <label key={s.value} className={`adFaq__chip${on ? " is-on" : ""}`}>
                          <input type="checkbox" checked={on}
                                 onChange={(e) => set(i, {
                                   services: e.target.checked
                                     ? [...(r.services ?? []), s.value as never]
                                     : (r.services ?? []).filter((x) => x !== s.value),
                                 })} />
                          {on ? <Check aria-hidden="true" /> : null}
                          <span>{s.label}</span>
                        </label>
                      );
                    })}
                  </fieldset>
                  <div className="adFaq__tools" role="group" aria-label={`Question ${i + 1}`}>
                    <button type="button" className="ad__btn" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp aria-hidden="true" /><span>Move up</span></button>
                    <button type="button" className="ad__btn" onClick={() => move(i, 1)} disabled={i === rows.length - 1}><ArrowDown aria-hidden="true" /><span>Move down</span></button>
                    <button type="button" className="ad__btn ad__btn--danger adFaq__rm" onClick={() => remove(i)} disabled={rows.length === 1}><Trash2 aria-hidden="true" /><span>Remove</span></button>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ol>
        <button type="button" className="ad__btn adFaq__add" disabled={rows.length >= FAQ_LIMITS.items}
                onClick={() => setRows((all) => [...all.map((r) => ({ ...r, open: false })), { q: "", a: "", key: seq.current++, open: true }])}>
          <Plus aria-hidden="true" /> Add a question
        </button>
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
