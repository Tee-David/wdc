"use client";

import { useId, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ExternalLink, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import type { LegalDoc } from "@/lib/legal";
import { LEGAL_LIMITS } from "@/lib/legal-validate";
import { resetPolicy, savePolicy } from "@/lib/admin/legal-actions";
import { Actions, Form, Hidden, Submit } from "./form";
import { ask } from "./confirm";
import "./faq-editor.css";

type Row = { key: number; open: boolean; heading: string; tab: string; text: string };
type Tab = { key: number; id: string; label: string };

const idFrom = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24);

/**
 * One policy: its summary, its opening paragraph, its tabs (if it has any) and
 * its sections, in the order the site shows them. A section's text is plain
 * paragraphs separated by a blank line; names of other policies and the studio
 * email become links on their own. Saving sets the last-updated date to today,
 * keeps the version it replaces, and shows on the public page at once.
 */
export function LegalEditor({ doc, edited }: { doc: LegalDoc; edited: boolean }) {
  const uid = useId();
  const seq = useRef(100);
  const [blurb, setBlurb] = useState(doc.blurb);
  const [intro, setIntro] = useState(doc.intro);
  const [tabs, setTabs] = useState<Tab[]>(() => (doc.tabs ?? []).map((t, i) => ({ key: i, id: t.id, label: t.label })));
  const [rows, setRows] = useState<Row[]>(() => doc.sections.map((s, i) => ({ key: i, open: false, heading: s.heading, tab: s.tab ?? doc.tabs?.[0]?.id ?? "", text: s.body.join("\n\n") })));
  const set = (i: number, patch: Partial<Row>) => setRows((all) => all.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const move = (i: number, by: number) => setRows((all) => { const next = [...all]; const [r] = next.splice(i, 1); next.splice(i + by, 0, r); return next; });
  const moveTab = (i: number, by: number) => setTabs((all) => { const next = [...all]; const [t] = next.splice(i, 1); next.splice(i + by, 0, t); return next; });
  const tabLabel = (id: string) => tabs.find((t) => t.id === id)?.label ?? "";

  const remove = async (i: number) => {
    if (await ask(`Remove “${rows[i].heading.trim() || "this section"}”? It comes off the policy when you save.`, { verb: "Remove" })) setRows((all) => all.filter((_, j) => j !== i));
  };
  const removeTab = async (i: number) => {
    const t = tabs[i];
    if (tabs.length === 1) { if (await ask("Turn tabs off? The policy becomes one page again.", { verb: "Turn off" })) { setTabs([]); setRows((all) => all.map((r) => ({ ...r, tab: "" }))); } return; }
    if (await ask(`Remove the “${t.label}” tab? Its sections move to the first tab.`, { verb: "Remove" })) {
      const rest = tabs.filter((_, j) => j !== i);
      setTabs(rest);
      setRows((all) => all.map((r) => (r.tab === t.id ? { ...r, tab: rest[0].id } : r)));
    }
  };
  const addTab = () => {
    const label = `New tab ${tabs.length + 1}`;
    setTabs((all) => [...all, { key: seq.current++, id: idFrom(label) + "-" + seq.current, label }]);
    if (!tabs.length) setRows((all) => all.map((r) => ({ ...r, tab: "" })));
  };
  const renameTab = (i: number, label: string) => setTabs((all) => all.map((t, j) => (j === i ? { ...t, label } : t)));

  const policy = JSON.stringify({
    blurb, intro,
    ...(tabs.length ? { tabs: tabs.map((t) => ({ id: t.id, label: t.label })) } : {}),
    sections: rows.map((r) => ({ heading: r.heading, ...(tabs.length ? { tab: r.tab || tabs[0].id } : {}), body: r.text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean) })),
  });

  return (
    <>
      <Form action={savePolicy} className="adFaq">
        <Hidden name="slug" value={doc.slug} />
        <Hidden name="policy" value={policy} />
        <label className="adFaq__field">
          <span>One-line summary on the Legal page <i>{blurb.length}/{LEGAL_LIMITS.blurb}</i></span>
          <textarea rows={2} value={blurb} maxLength={LEGAL_LIMITS.blurb} onChange={(e) => setBlurb(e.target.value)} />
        </label>
        <label className="adFaq__field">
          <span>Opening paragraph <i>{intro.length}/{LEGAL_LIMITS.intro}</i></span>
          <textarea rows={4} value={intro} maxLength={LEGAL_LIMITS.intro} onChange={(e) => setIntro(e.target.value)} />
        </label>

        <fieldset className="adFaq__chips">
          <legend>Tabs <span className="ad__dim">(optional: one per service, say. A section with no tabs is part of one long page.)</span></legend>
          {tabs.map((t, i) => (
            <div key={t.key} className="adFaq__tools" role="group" aria-label={`Tab ${i + 1}`}>
              <input aria-label={`Name of tab ${i + 1}`} value={t.label} maxLength={LEGAL_LIMITS.tabLabel} onChange={(e) => renameTab(i, e.target.value)} />
              <button type="button" className="ad__btn" onClick={() => moveTab(i, -1)} disabled={i === 0} aria-label={`Move tab ${t.label} left`}><ArrowUp aria-hidden="true" /></button>
              <button type="button" className="ad__btn" onClick={() => moveTab(i, 1)} disabled={i === tabs.length - 1} aria-label={`Move tab ${t.label} right`}><ArrowDown aria-hidden="true" /></button>
              <button type="button" className="ad__btn ad__btn--danger" onClick={() => removeTab(i)} aria-label={`Remove tab ${t.label}`}><Trash2 aria-hidden="true" /></button>
            </div>
          ))}
          <button type="button" className="ad__btn" onClick={addTab} disabled={tabs.length >= LEGAL_LIMITS.tabs}><Plus aria-hidden="true" /> Add a tab</button>
        </fieldset>

        <p className="adFaq__count ad__dim">{rows.length} section{rows.length === 1 ? "" : "s"}, in the order the site shows them. Tap one to edit it.</p>
        <ol className="adFaq__list">
          {rows.map((r, i) => (
            <li key={r.key} className={`adFaq__item${r.open ? " is-open" : ""}`}>
              <button type="button" className="adFaq__head" aria-expanded={r.open} aria-controls={`${uid}-${r.key}`} onClick={() => set(i, { open: !r.open })}>
                <span className="adFaq__num" aria-hidden="true">{i + 1}</span>
                <span className="adFaq__sum"><b>{r.heading.trim() || "New section"}</b><small>{tabs.length ? tabLabel(r.tab) || tabs[0].label : "One page"}</small></span>
                <ChevronDown className="adFaq__chev" aria-hidden="true" />
              </button>
              {r.open ? (
                <div className="adFaq__body" id={`${uid}-${r.key}`}>
                  <label className="adFaq__field">
                    <span>Heading <i>{r.heading.length}/{LEGAL_LIMITS.heading}</i></span>
                    <input aria-label={`Heading ${i + 1}`} value={r.heading} maxLength={LEGAL_LIMITS.heading} onChange={(e) => set(i, { heading: e.target.value })} />
                  </label>
                  {tabs.length ? (
                    <label className="adFaq__field">
                      <span>Tab</span>
                      <select aria-label={`Tab for section ${i + 1}`} value={r.tab || tabs[0].id} onChange={(e) => set(i, { tab: e.target.value })}>
                        {tabs.map((t) => <option key={t.key} value={t.id}>{t.label}</option>)}
                      </select>
                    </label>
                  ) : null}
                  <label className="adFaq__field">
                    <span>Text <i>paragraphs separated by a blank line</i></span>
                    <textarea aria-label={`Text ${i + 1}`} rows={10} value={r.text} onChange={(e) => set(i, { text: e.target.value })} />
                  </label>
                  <div className="adFaq__tools" role="group" aria-label={`Move or remove section ${i + 1}`}>
                    <button type="button" className="ad__btn" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp aria-hidden="true" /><span>Move up</span></button>
                    <button type="button" className="ad__btn" onClick={() => move(i, 1)} disabled={i === rows.length - 1}><ArrowDown aria-hidden="true" /><span>Move down</span></button>
                    <button type="button" className="ad__btn ad__btn--danger adFaq__rm" onClick={() => remove(i)} disabled={rows.length === 1}><Trash2 aria-hidden="true" /><span>Remove</span></button>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ol>
        <button type="button" className="ad__btn adFaq__add" disabled={rows.length >= LEGAL_LIMITS.sections}
                onClick={() => setRows((all) => [...all.map((r) => ({ ...r, open: false })), { key: seq.current++, open: true, heading: "", tab: tabs[0]?.id ?? "", text: "" }])}>
          <Plus aria-hidden="true" /> Add a section
        </button>
        <Actions>
          <Submit icon={Save}>Save this policy</Submit>
          <a className="ad__btn" href={`/legal/${doc.slug}`} target="_blank" rel="noreferrer"><ExternalLink aria-hidden="true" /><span>View on the site</span></a>
        </Actions>
      </Form>
      {edited ? (
        <Form action={resetPolicy} confirm={`Put back the ${doc.title} that shipped with the site? Your edits are replaced, and kept in the history.`}>
          <Hidden name="slug" value={doc.slug} />
          <Actions><Submit tone="plain" icon={RotateCcw}>Reset to what shipped</Submit></Actions>
        </Form>
      ) : null}
    </>
  );
}
