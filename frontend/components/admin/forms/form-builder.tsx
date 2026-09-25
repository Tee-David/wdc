"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown, ArrowUp, ChevronDown, Copy, ExternalLink, Loader2, Plus, Rocket, Save, Trash2,
} from "lucide-react";
import { FIELD_TYPES, type CustomField, type CustomFormDef, type FieldType } from "@/lib/forms/custom-def";
import { publishForm, saveFormDraft, setFormOpen } from "@/lib/forms/custom-actions";
import { CustomFormView } from "@/components/forms/custom-form-view";
import { Form, Hidden, Submit } from "@/components/admin/form";
import { toast } from "@/components/admin/toast";
import "@/components/preview/preview.css";
import "./form-builder.css";

const CHOICE: FieldType[] = ["select", "radio", "checkboxes"];
const typeLabel = (t: FieldType) => FIELD_TYPES.find((f) => f.type === t)?.label ?? t;
const newId = (t: FieldType) => `${t}_${Math.random().toString(36).slice(2, 6)}`;

/**
 * THE FORM BUILDER (Forms, New form). The questions on the left, the form as
 * a visitor will see it on the right, updating as you type. Save keeps a
 * draft; Publish makes the draft the next numbered version, and entries keep
 * the version they answered, so editing a live form never rewrites an answer.
 */
export function FormBuilder({ formKey, slug, status, version, initial, siteUrl }: {
  formKey: string; slug: string; status: "draft" | "live" | "closed"; version: number; initial: CustomFormDef; siteUrl: string;
}) {
  const [def, setDef] = useState<CustomFormDef>(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [open, setOpenIdx] = useState<number | null>(null);
  const [busy, setBusy] = useState<"save" | "publish" | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const dirty = JSON.stringify(def) !== saved;

  useEffect(() => {
    if (!dirty) return;
    const stay = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", stay);
    return () => window.removeEventListener("beforeunload", stay);
  }, [dirty]);

  const patch = (p: Partial<CustomFormDef>) => setDef((d) => ({ ...d, ...p }));
  const setField = (i: number, p: Partial<CustomField>) => setDef((d) => ({ ...d, fields: d.fields.map((f, j) => (j === i ? { ...f, ...p } : f)) }));
  const move = (i: number, by: number) => setDef((d) => {
    const to = i + by;
    if (to < 0 || to >= d.fields.length) return d;
    const fields = [...d.fields];
    [fields[i], fields[to]] = [fields[to], fields[i]];
    setOpenIdx((o) => (o === i ? to : o === to ? i : o));
    return { ...d, fields };
  });
  const remove = (i: number) => { setDef((d) => ({ ...d, fields: d.fields.filter((_, j) => j !== i) })); setOpenIdx(null); };
  const duplicate = (i: number) => setDef((d) => {
    const copy = { ...d.fields[i], id: newId(d.fields[i].type), label: `${d.fields[i].label} (copy)` };
    const fields = [...d.fields.slice(0, i + 1), copy, ...d.fields.slice(i + 1)];
    setOpenIdx(i + 1);
    return { ...d, fields };
  });
  const add = (type: FieldType) => {
    const field: CustomField = { id: newId(type), type, label: type === "heading" ? "Section" : typeLabel(type), ...(CHOICE.includes(type) ? { options: ["First choice", "Second choice"] } : {}) };
    setDef((d) => ({ ...d, fields: [...d.fields, field] }));
    setOpenIdx(def.fields.length);
    setAdding(false);
  };

  const save = async () => {
    setBusy("save");
    const r = await saveFormDraft({ key: formKey, def }).catch(() => null);
    setBusy(null);
    if (!r?.ok) { toast(r?.message ?? "The draft could not be saved.", "bad"); return; }
    setSaved(JSON.stringify(def));
    setProblems(r.problems ?? []);
    toast(r.problems?.length ? "Draft saved. It has things to fix before it can be published." : "Draft saved.");
  };
  const publish = async () => {
    setBusy("publish");
    const r = await publishForm({ key: formKey, def }).catch(() => null);
    setBusy(null);
    setProblems(r?.problems ?? []);
    if (!r?.ok) { toast(r?.message ?? "The form could not be published.", "bad"); return; }
    setSaved(JSON.stringify(def));
    toast(r.message ?? "Published.");
  };

  const live = `${siteUrl}/f/${slug}`;
  /* The preview is remounted when a question's shape changes, so an answer
     typed into a question that has since become a different type is dropped. */
  const previewKey = useMemo(() => def.fields.map((f) => `${f.id}:${f.type}`).join("|"), [def.fields]);

  return (
    <div className="adBuild">
      <div className="adBuild__bar">
        <span className={`ad__pill ${status === "live" ? "ad__pill--good" : status === "closed" ? "ad__pill--warn" : "ad__pill--flat"}`}>
          {status === "live" ? `Live, version ${version}` : status === "closed" ? "Closed" : "Draft, not published"}
        </span>
        {dirty ? <span className="adBuild__dirty" role="status">Unsaved changes</span> : null}
        <span className="adBuild__acts">
          {version ? <a className="ad__btn" href={live} target="_blank" rel="noopener noreferrer"><ExternalLink aria-hidden="true" /> View live</a> : null}
          <button type="button" className="ad__btn" onClick={() => void save()} disabled={Boolean(busy)}>
            {busy === "save" ? <Loader2 className="ad__spin" aria-hidden="true" /> : <Save aria-hidden="true" />} Save draft
          </button>
          <button type="button" className="ad__btn ad__btn--primary" onClick={() => void publish()} disabled={Boolean(busy)}>
            {busy === "publish" ? <Loader2 className="ad__spin" aria-hidden="true" /> : <Rocket aria-hidden="true" />} {version ? "Publish changes" : "Publish"}
          </button>
        </span>
      </div>

      {problems.length ? (
        <div className="ad__msg is-bad adBuild__problems" role="alert">
          <b>Before it can be published:</b>
          <ul>{problems.map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
      ) : null}

      <div className="adBuild__cols">
        <div className="adBuild__edit">
          <section className="ad__panel">
            <div className="ad__panelH"><h2>The form</h2></div>
            <div className="adSetPad">
              <div className="ad__fields">
                <div className="ad__f"><label className="ad__fl" htmlFor="b-title">Title</label>
                  <input id="b-title" value={def.title} maxLength={120} onChange={(e) => patch({ title: e.target.value })} /></div>
                <div className="ad__f"><label className="ad__fl" htmlFor="b-intro">Introduction <span className="ad__dim">(optional)</span></label>
                  <textarea id="b-intro" rows={2} value={def.intro} maxLength={1000} onChange={(e) => patch({ intro: e.target.value })} /></div>
                <div className="ad__f ad__f--half"><label className="ad__fl" htmlFor="b-submit">Button</label>
                  <input id="b-submit" value={def.submitLabel} maxLength={40} onChange={(e) => patch({ submitLabel: e.target.value })} /></div>
                <div className="ad__f ad__f--half"><span className="ad__fl">Address</span>
                  <span className="adBuild__addr"><code>/f/{slug}</code>
                    <button type="button" className="ad__iconButton" aria-label="Copy the form's address" onClick={async () => {
                      try { await navigator.clipboard.writeText(live); toast("Address copied."); } catch { toast("Select the address and copy it.", "bad"); }
                    }}><Copy aria-hidden="true" /></button></span></div>
                <div className="ad__f"><label className="ad__fl" htmlFor="b-thanks">After sending, say</label>
                  <textarea id="b-thanks" rows={2} value={def.successMessage} maxLength={400} onChange={(e) => patch({ successMessage: e.target.value })} /></div>
              </div>
            </div>
          </section>

          <section className="ad__panel">
            <div className="ad__panelH"><h2>{def.fields.length} {def.fields.length === 1 ? "question" : "questions"}</h2></div>
            <ol className="adBuild__fields">
              {def.fields.map((f, i) => (
                <FieldCard key={f.id} f={f} i={i} count={def.fields.length} open={open === i} earlier={def.fields.slice(0, i)}
                  onToggle={() => setOpenIdx(open === i ? null : i)} onChange={(p) => setField(i, p)}
                  onMove={(by) => move(i, by)} onRemove={() => remove(i)} onDuplicate={() => duplicate(i)} />
              ))}
            </ol>
            <div className="adSetPad adBuild__add">
              <button type="button" className="ad__btn" aria-expanded={adding} onClick={() => setAdding((a) => !a)}><Plus aria-hidden="true" /> Add a question</button>
              {adding ? (
                <div className="adBuild__types" role="group" aria-label="Question types">
                  {FIELD_TYPES.map((t) => <button key={t.type} type="button" className="ad__btn" onClick={() => add(t.type)}>{t.label}</button>)}
                </div>
              ) : null}
            </div>
          </section>

          {version ? (
            <section className="ad__panel">
              <div className="ad__panelH"><h2>Taking entries</h2></div>
              <div className="adSetPad">
                <Form action={setFormOpen}>
                  <Hidden name="key" value={formKey} />
                  <Hidden name="open" value={status === "live" ? "0" : "1"} />
                  <p className="ad__dim" style={{ margin: "0 0 .6rem" }}>{status === "live" ? "The form is open at its address." : "The form is closed; its address says so."}</p>
                  <Submit tone={status === "live" ? "plain" : "primary"}>{status === "live" ? "Close the form" : "Open the form"}</Submit>
                </Form>
                <p className="ad__dim adBuild__more">Limits, dates, blocked words and the studio&apos;s email are in the form&apos;s <Link href={`/admin/forms/${formKey}?view=settings`}>Settings</Link>. Entries are under <Link href={`/admin/forms/${formKey}`}>Entries</Link>.</p>
              </div>
            </section>
          ) : null}
        </div>

        <aside className="adBuild__preview" aria-label="Preview">
          <p className="adBuild__previewH">Preview</p>
          <div className="pv adBuild__page">
            <h2 className="adBuild__pTitle">{def.title || "Untitled form"}</h2>
            <CustomFormView key={previewKey} def={def} preview />
          </div>
        </aside>
      </div>
    </div>
  );
}

function FieldCard({ f, i, count, open, earlier, onToggle, onChange, onMove, onRemove, onDuplicate }: {
  f: CustomField; i: number; count: number; open: boolean; earlier: CustomField[];
  onToggle: () => void; onChange: (p: Partial<CustomField>) => void; onMove: (by: number) => void; onRemove: () => void; onDuplicate: () => void;
}) {
  const id = `q-${f.id}`;
  const choices = earlier.filter((x) => CHOICE.includes(x.type));
  const cond = f.showIf ? earlier.find((x) => x.id === f.showIf!.field) : undefined;
  return (
    <li className={`adBuild__card${open ? " is-open" : ""}`}>
      <div className="adBuild__cardH">
        <button type="button" className="adBuild__toggle" aria-expanded={open} aria-controls={`${id}-body`} onClick={onToggle}>
          <span className="adBuild__n">{i + 1}</span>
          <span className="adBuild__t"><b>{f.label || "Untitled question"}</b><small>{typeLabel(f.type)}{f.required ? " · required" : ""}{f.showIf ? " · conditional" : ""}</small></span>
          <ChevronDown aria-hidden="true" className="adBuild__chev" />
        </button>
        <span className="adBuild__order">
          <button type="button" className="ad__iconButton" aria-label={`Move "${f.label}" up`} disabled={i === 0} onClick={() => onMove(-1)}><ArrowUp aria-hidden="true" /></button>
          <button type="button" className="ad__iconButton" aria-label={`Move "${f.label}" down`} disabled={i === count - 1} onClick={() => onMove(1)}><ArrowDown aria-hidden="true" /></button>
        </span>
      </div>
      {open ? (
        <div id={`${id}-body`} className="adBuild__body">
          <div className="ad__fields">
            <div className="ad__f"><label className="ad__fl" htmlFor={`${id}-label`}>{f.type === "heading" ? "Heading" : f.type === "consent" ? "What they agree to" : "Question"}</label>
              <input id={`${id}-label`} value={f.label} maxLength={160} onChange={(e) => onChange({ label: e.target.value })} /></div>
            <div className="ad__f"><label className="ad__fl" htmlFor={`${id}-help`}>Help text <span className="ad__dim">(optional)</span></label>
              <input id={`${id}-help`} value={f.help ?? ""} maxLength={300} onChange={(e) => onChange({ help: e.target.value })} /></div>
            {f.type !== "heading" && f.type !== "consent" && !CHOICE.includes(f.type) || f.type === "select" ? (
              <div className="ad__f ad__f--half"><label className="ad__fl" htmlFor={`${id}-ph`}>Placeholder <span className="ad__dim">(optional)</span></label>
                <input id={`${id}-ph`} value={f.placeholder ?? ""} maxLength={160} onChange={(e) => onChange({ placeholder: e.target.value })} /></div>
            ) : null}
            {f.type === "number" ? (
              <>
                <div className="ad__f ad__f--half"><label className="ad__fl" htmlFor={`${id}-min`}>Smallest</label>
                  <input id={`${id}-min`} inputMode="decimal" value={f.min ?? ""} onChange={(e) => onChange({ min: e.target.value === "" ? undefined : Number(e.target.value) })} /></div>
                <div className="ad__f ad__f--half"><label className="ad__fl" htmlFor={`${id}-max`}>Largest</label>
                  <input id={`${id}-max`} inputMode="decimal" value={f.max ?? ""} onChange={(e) => onChange({ max: e.target.value === "" ? undefined : Number(e.target.value) })} /></div>
              </>
            ) : null}
            {CHOICE.includes(f.type) ? (
              <div className="ad__f"><label className="ad__fl" htmlFor={`${id}-opts`}>Choices, one per line</label>
                <textarea id={`${id}-opts`} rows={Math.min(8, Math.max(3, (f.options?.length ?? 2) + 1))} value={(f.options ?? []).join("\n")}
                  onChange={(e) => onChange({ options: e.target.value.split("\n").map((x) => x.slice(0, 160)) })} />
                <small className="ad__dim">{(f.options ?? []).filter((x) => x.trim()).length > 10 ? "More than ten: shown as a searchable list." : "Ten or fewer: shown as a plain list."}</small></div>
            ) : null}
          </div>
          {f.type !== "heading" ? (
            <label className="adBuild__check"><input type="checkbox" checked={Boolean(f.required)} onChange={(e) => onChange({ required: e.target.checked })} /> Required</label>
          ) : null}
          {choices.length ? (
            <div className="adBuild__cond">
              <label className="adBuild__check"><input type="checkbox" checked={Boolean(f.showIf)}
                onChange={(e) => onChange({ showIf: e.target.checked ? { field: choices[0].id, equals: [] } : undefined })} /> Only show this when an earlier answer is…</label>
              {f.showIf ? (
                <div className="ad__fields">
                  <div className="ad__f"><label className="ad__fl" htmlFor={`${id}-if`}>Question</label>
                    <select id={`${id}-if`} value={f.showIf.field} onChange={(e) => onChange({ showIf: { field: e.target.value, equals: [] } })}>
                      {choices.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select></div>
                  <fieldset className="ad__f adBuild__eq"><legend className="ad__fl">Any of</legend>
                    {(cond?.options ?? []).filter(Boolean).map((o) => (
                      <label key={o} className="adBuild__check"><input type="checkbox" checked={f.showIf!.equals.includes(o)}
                        onChange={(e) => onChange({ showIf: { field: f.showIf!.field, equals: e.target.checked ? [...f.showIf!.equals, o] : f.showIf!.equals.filter((x) => x !== o) } })} /> {o}</label>
                    ))}
                  </fieldset>
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="adBuild__cardActs">
            <button type="button" className="ad__btn" onClick={onDuplicate}><Copy aria-hidden="true" /> Duplicate</button>
            <button type="button" className="ad__btn ad__btn--danger" onClick={onRemove}><Trash2 aria-hidden="true" /> Remove</button>
          </div>
        </div>
      ) : null}
    </li>
  );
}
