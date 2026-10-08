"use client";

import { useState, useTransition } from "react";
import { Plus, Power, Trash2, Workflow } from "lucide-react";
import { newAutomationAction, removeAutomation, saveAutomationSteps, toggleAutomation } from "@/lib/admin/automation-actions";
import { Actions, Field, Fields, Form, Select, Submit } from "../form";
import { DialogButton } from "../dialog";
import { toast } from "../toast";
import type { Step } from "@/lib/automations";

export function NewAutomation() {
  return (
    <DialogButton label="New automation" title="New automation" icon={Workflow}>
      {() => (
        <Form action={newAutomationAction}>
          <Fields>
            <Field name="name" label="Name" required placeholder="Welcome series" />
            <Select name="trigger" label="Starts when" defaultValue="new_contact" options={[{ value: "new_contact", label: "Someone becomes a contact" }, { value: "tag_added", label: "A tag is added" }]} />
            <Field name="tag" label="Tag" placeholder="newsletter" hint="Only for “A tag is added”." />
            <Select name="kind" label="It is" defaultValue="marketing" options={[{ value: "marketing", label: "Marketing: only people who asked to hear from us" }, { value: "service", label: "Service: follow-up to people we work with" }]} />
          </Fields>
          <Actions><Submit icon={Workflow}>Start</Submit></Actions>
        </Form>
      )}
    </DialogButton>
  );
}

const rid = () => Math.random().toString(36).slice(2, 10);
const NEW: Record<Step["type"], () => Step> = {
  wait: () => ({ id: rid(), type: "wait", days: 1, hours: 0, weekdays: [], hour: null }),
  email: () => ({ id: rid(), type: "email", subject: "A note from us", design: { subject: "A note from us", preheader: "", heading: "A note from us", blocks: [{ id: rid(), type: "text", text: "Hi {{client.first_name | \"there\"}}," }] } }),
  tag: () => ({ id: rid(), type: "tag", tag: "", remove: false }),
  stop_if_tag: () => ({ id: rid(), type: "stop_if_tag", tag: "" }),
  note: () => ({ id: rid(), type: "note", text: "" }),
  webhook: () => ({ id: rid(), type: "webhook", url: "https://" }),
};
const LABEL: Record<Step["type"], string> = { wait: "Wait", email: "Send an email", tag: "Add or remove a tag", stop_if_tag: "Stop if they have a tag", note: "Add a note", webhook: "Call a web address" };

/** The chain as a short list. An email step holds a subject and its text; the full builder is the campaign editor's. */
export function StepEditor({ id, initial }: { id: string; initial: Step[] }) {
  const [steps, setSteps] = useState<Step[]>(initial);
  const [pending, start] = useTransition();
  const set = (i: number, patch: Partial<Step>) => setSteps((s) => s.map((x, j) => (j === i ? ({ ...x, ...patch } as Step) : x)));
  const move = (i: number, d: number) => setSteps((s) => { const n = [...s]; const j = i + d; if (j < 0 || j >= n.length) return s; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const save = () => start(async () => { const r = await saveAutomationSteps(id, JSON.stringify(steps)); toast(r.ok ? "Saved" : r.message ?? "Not saved", r.ok ? "good" : "bad"); });
  return (
    <div className="ad__stack">
      <ol className="ad__stack" style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {steps.map((s, i) => (
          <li key={s.id} className="ad__panel" style={{ padding: 14 }}>
            <div className="ad__row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <b>{LABEL[s.type]}</b>
              <span className="ad__row">
                <button type="button" className="ad__btn ad__btn--plain" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
                <button type="button" className="ad__btn ad__btn--plain" onClick={() => move(i, 1)} disabled={i === steps.length - 1} aria-label="Move down">↓</button>
                <button type="button" className="ad__btn ad__btn--plain" onClick={() => setSteps((x) => x.filter((_, j) => j !== i))} aria-label="Remove step"><Trash2 aria-hidden="true" /></button>
              </span>
            </div>
            {s.type === "wait" ? (
              <div className="ad__row" style={{ gap: 12, flexWrap: "wrap" }}>
                <label className="ad__f">Days<input className="ad__in" type="number" min={0} max={365} value={s.days} onChange={(e) => set(i, { days: Math.max(0, Math.min(365, Number(e.target.value) || 0)) })} /></label>
                <label className="ad__f">Hours<input className="ad__in" type="number" min={0} max={23} value={s.hours} onChange={(e) => set(i, { hours: Math.max(0, Math.min(23, Number(e.target.value) || 0)) })} /></label>
              </div>
            ) : null}
            {s.type === "email" ? (
              <div className="ad__stack">
                <label className="ad__f">Subject<input className="ad__in" value={s.subject} maxLength={150} onChange={(e) => set(i, { subject: e.target.value, design: { ...s.design, subject: e.target.value, heading: e.target.value } })} /></label>
                <label className="ad__f">Message<textarea className="ad__in" rows={5} value={s.design.blocks.find((b) => b.type === "text" && "text" in b)?.type === "text" ? (s.design.blocks.find((b) => b.type === "text") as { text: string }).text : ""}
                  onChange={(e) => set(i, { design: { ...s.design, blocks: [{ id: s.design.blocks[0]?.id ?? rid(), type: "text", text: e.target.value }, ...s.design.blocks.slice(1).filter((b) => b.type !== "text")] } })} /></label>
              </div>
            ) : null}
            {s.type === "tag" ? (
              <div className="ad__row" style={{ gap: 12, flexWrap: "wrap" }}>
                <label className="ad__f">Tag<input className="ad__in" value={s.tag} maxLength={40} onChange={(e) => set(i, { tag: e.target.value.toLowerCase() })} /></label>
                <label className="ad__row"><input type="checkbox" checked={s.remove} onChange={(e) => set(i, { remove: e.target.checked })} /> Remove instead of add</label>
              </div>
            ) : null}
            {s.type === "stop_if_tag" ? <label className="ad__f">Tag<input className="ad__in" value={s.tag} maxLength={40} onChange={(e) => set(i, { tag: e.target.value.toLowerCase() })} /></label> : null}
            {s.type === "note" ? <label className="ad__f">Note on their record<input className="ad__in" value={s.text} maxLength={300} onChange={(e) => set(i, { text: e.target.value })} /></label> : null}
            {s.type === "webhook" ? <label className="ad__f">https address<input className="ad__in" value={s.url} maxLength={300} onChange={(e) => set(i, { url: e.target.value })} /></label> : null}
          </li>
        ))}
      </ol>
      <div className="ad__row" style={{ gap: 8, flexWrap: "wrap" }}>
        {(Object.keys(LABEL) as Step["type"][]).map((t) => (
          <button key={t} type="button" className="ad__btn ad__btn--plain" onClick={() => setSteps((s) => [...s, NEW[t]()])}><Plus aria-hidden="true" /> {LABEL[t]}</button>
        ))}
      </div>
      <div><button type="button" className="ad__btn" onClick={save} disabled={pending}>{pending ? "Saving…" : "Save steps"}</button></div>
    </div>
  );
}

export function AutomationButtons({ id, enabled }: { id: string; enabled: boolean }) {
  return (
    <span className="ad__row" style={{ gap: 8 }}>
      <Form action={toggleAutomation}><input type="hidden" name="id" value={id} /><input type="hidden" name="on" value={enabled ? "0" : "1"} /><Actions><Submit icon={Power}>{enabled ? "Switch off" : "Switch on"}</Submit></Actions></Form>
      <Form action={removeAutomation}><input type="hidden" name="id" value={id} /><Actions><Submit icon={Trash2}>Delete</Submit></Actions></Form>
    </span>
  );
}
