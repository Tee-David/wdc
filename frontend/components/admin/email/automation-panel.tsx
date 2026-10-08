"use client";

import { useId, useMemo, useState } from "react";
import { GitBranch, Info, TriangleAlert, X } from "lucide-react";
import { Pick } from "../pick";
import { emailText, stepProblem, TYPE_LABEL, withEmailText, withSubject, type Step } from "@/lib/automations-flow";
import { Tile } from "./automation-tile";

export type Meta = { name: string; kind: "marketing" | "service"; triggerKind: "tag_added" | "new_contact"; triggerValue: string };
export type TagCount = { tag: string; n: number };
export type Results = { reached: Record<string, number> | null; upNext: Record<string, number> };
export type Totals = { active: number; completed: number; stopped: number };

/** Existing tags to pick from (searchable), or a new one typed below. A tag step is the one place a tag may not exist yet. */
function TagField({ label, value, tags, onChange }: { label: string; value: string; tags: TagCount[]; onChange: (v: string) => void }) {
  const id = useId();
  const [typed, setTyped] = useState("");
  const options = useMemo(() => {
    const list = tags.map((t) => ({ value: t.tag, label: `${t.tag} (${t.n})` }));
    return value && !tags.some((t) => t.tag === value) ? [{ value, label: value }, ...list] : list;
  }, [tags, value]);
  return (
    <div className="adWf__tagrow">
      <div className="ad__f">
        <span className="ad__fl" id={`${id}-l`}>{label}</span>
        <Pick options={options} value={value} placeholder="Choose a tag" search labelledBy={`${id}-l`} onChange={(v) => { setTyped(""); onChange(v); }} />
      </div>
      <label className="ad__f">
        <span className="ad__fl">Or a new tag</span>
        <input value={typed} maxLength={40} placeholder="a-new-tag" autoComplete="off"
          onChange={(e) => { const v = e.target.value.toLowerCase().replace(/[^a-z0-9 _-]/g, ""); setTyped(v); if (v.trim()) onChange(v); }} />
      </label>
    </div>
  );
}

function Stepper({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (n: number) => void }) {
  const id = useId();
  const clamp = (n: number) => Math.max(0, Math.min(max, Math.round(n) || 0));
  return (
    <div className="ad__f">
      <label className="ad__fl" htmlFor={id}>{label}</label>
      <div className="adWf__stepper">
        <button type="button" aria-label={`One ${label.toLowerCase().replace(/s$/, "")} less`} onClick={() => onChange(clamp(value - 1))}>−</button>
        <input id={id} value={value} inputMode="numeric" onChange={(e) => onChange(clamp(Number(e.target.value.replace(/\D/g, ""))))} />
        <button type="button" aria-label={`One ${label.toLowerCase().replace(/s$/, "")} more`} onClick={() => onChange(clamp(value + 1))}>+</button>
      </div>
    </div>
  );
}

function Seg<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="adWf__seg" role="group" aria-label={label} style={{ width: "100%" }}>
      {options.map(([v, text]) => <button key={v} type="button" style={{ flex: 1 }} aria-pressed={value === v} onClick={() => onChange(v)}>{text}</button>)}
    </div>
  );
}

function PanelTabs({ tab, setTab }: { tab: "setup" | "res"; setTab: (t: "setup" | "res") => void }) {
  const go = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = tab === "setup" ? "res" : "setup";
    setTab(next);
    requestAnimationFrame(() => (e.currentTarget as HTMLElement).parentElement?.querySelector<HTMLElement>(`[data-tab="${next}"]`)?.focus());
  };
  return (
    <div className="adWf__tabs" role="tablist" aria-label="Step panel">
      {([["setup", "Setup"], ["res", "Results"]] as const).map(([k, text]) => (
        <button key={k} type="button" role="tab" data-tab={k} aria-selected={tab === k} tabIndex={tab === k ? 0 : -1} onClick={() => setTab(k)} onKeyDown={go}>{text}</button>
      ))}
    </div>
  );
}

const Kpi = ({ label, value }: { label: string; value: string }) => <div className="adWf__kpi"><span>{label}</span><b>{value}</b></div>;
const NoCounts = () => <div className="adWf__note"><Info aria-hidden="true" /><span>Counts begin once migration 0048 is applied (Settings › System). Nothing is shown until then rather than a guess.</span></div>;

export function StepPanel({ step, tab, setTab, tags, results, onPatch, onDelete, onClose, initialFocus }: {
  step: Step; tab: "setup" | "res"; setTab: (t: "setup" | "res") => void; tags: TagCount[]; results: Results;
  onPatch: (patch: Partial<Step>) => void; onDelete: () => void; onClose: () => void; initialFocus: "name" | "close" | null;
}) {
  const problem = stepProblem(step);
  const reached = results.reached ? results.reached[step.id] ?? 0 : null;
  return (
    <>
      <header className="adWf__ph">
        <Tile type={step.type} />
        <input id="adWf-name" value={step.name ?? ""} placeholder={TYPE_LABEL[step.type]} aria-label="Step name" maxLength={60}
          autoFocus={initialFocus === "name"} onChange={(e) => onPatch({ name: e.target.value })} />
        <button type="button" className="adWf__x" onClick={onClose} aria-label="Close the panel" autoFocus={initialFocus === "close"}><X aria-hidden="true" /></button>
      </header>
      <PanelTabs tab={tab} setTab={setTab} />
      <div className="adWf__pb" role="tabpanel">
        {tab === "res" ? (
          results.reached === null ? <NoCounts /> : (
            <>
              <Kpi label={step.type === "email" ? "Emails sent" : "Reached this step"} value={String(reached ?? 0)} />
              <Kpi label="On their way here now" value={String(results.upNext[step.id] ?? 0)} />
              <p className="adWf__hint">Counted each time the step runs for a person, from the day migration 0048 was applied.</p>
            </>
          )
        ) : (
          <>
            {problem ? <div className="adWf__note adWf__note--bad" role="status"><TriangleAlert aria-hidden="true" /><span>{problem}</span></div> : null}
            {step.type === "email" ? (
              <>
                <label className="ad__f"><span className="ad__fl">Subject</span>
                  <input value={step.subject} maxLength={150} placeholder="What they see in their inbox" onChange={(e) => onPatch({ subject: e.target.value, design: withSubject(step, e.target.value) })} /></label>
                <label className="ad__f"><span className="ad__fl">Message</span>
                  <textarea value={emailText(step)} placeholder={'Hi {{contact.first_name | "there"}},'} onChange={(e) => onPatch({ design: withEmailText(step, e.target.value) })} /></label>
                <p className="adWf__hint">The unsubscribe link and the reason they are getting it are added for you. Use {"{{contact.first_name}}"} for their name.</p>
              </>
            ) : null}
            {step.type === "wait" ? (
              <>
                <Stepper label="Days" value={step.days} max={365} onChange={(days) => onPatch({ days })} />
                <Stepper label="Hours" value={step.hours} max={23} onChange={(hours) => onPatch({ hours })} />
                <p className="adWf__hint">The person waits here, then goes to the next step.</p>
              </>
            ) : null}
            {step.type === "tag" ? (
              <>
                <TagField label="Tag" value={step.tag} tags={tags} onChange={(tag) => onPatch({ tag })} />
                <Seg label="What to do with the tag" value={step.remove ? "remove" : "add"} options={[["add", "Add the tag"], ["remove", "Remove it"]]} onChange={(v) => onPatch({ remove: v === "remove" })} />
              </>
            ) : null}
            {step.type === "if" ? (
              <>
                <div className="adWf__note"><GitBranch aria-hidden="true" /><span>People who have this tag go down <b>Yes</b>. Everyone else goes down <b>No</b>. Paths do not join again: when a path ends, so does the run.</span></div>
                <TagField label="Has the tag" value={step.tag} tags={tags} onChange={(tag) => onPatch({ tag })} />
              </>
            ) : null}
            {step.type === "stop_if_tag" ? (
              <>
                <div className="adWf__note"><Info aria-hidden="true" /><span>An older kind of step: the run ends here for anyone with this tag. A new Yes/No check does the same and more.</span></div>
                <TagField label="Stop if they have" value={step.tag} tags={tags} onChange={(tag) => onPatch({ tag })} />
              </>
            ) : null}
            {step.type === "note" ? <label className="ad__f"><span className="ad__fl">Note on their record</span><textarea value={step.text} maxLength={300} onChange={(e) => onPatch({ text: e.target.value })} /></label> : null}
            {step.type === "webhook" ? (
              <>
                <label className="ad__f"><span className="ad__fl">https address</span><input value={step.url} maxLength={300} inputMode="url" onChange={(e) => onPatch({ url: e.target.value })} /></label>
                <p className="adWf__hint">We send the automation name, their email and name. Private or non-https addresses are refused.</p>
              </>
            ) : null}
            {step.type === "stop" ? <div className="adWf__note"><Info aria-hidden="true" /><span>The person leaves the automation here. Nothing more is sent.</span></div> : null}
          </>
        )}
      </div>
      <footer className="adWf__pf">
        <button type="button" className="ad__btn adWf__del" onClick={onDelete}>Delete</button>
        <button type="button" className="ad__btn ad__btn--primary" onClick={onClose}>Done</button>
      </footer>
    </>
  );
}

export function TriggerPanel({ meta, setMeta, tags, totals, tab, setTab, onClose, initialFocus }: {
  meta: Meta; setMeta: (m: Partial<Meta>) => void; tags: TagCount[]; totals: Totals; tab: "setup" | "res"; setTab: (t: "setup" | "res") => void; onClose: () => void; initialFocus: "name" | "close" | null;
}) {
  const entered = totals.active + totals.completed + totals.stopped;
  return (
    <>
      <header className="adWf__ph">
        <Tile type="trigger" />
        <h2>Trigger</h2>
        <button type="button" className="adWf__x" onClick={onClose} aria-label="Close the panel" autoFocus={initialFocus !== null}><X aria-hidden="true" /></button>
      </header>
      <PanelTabs tab={tab} setTab={setTab} />
      <div className="adWf__pb" role="tabpanel">
        {tab === "res" ? (
          <>
            <Kpi label="People who have entered" value={String(entered)} />
            <Kpi label="Still in the chain" value={String(totals.active)} />
            <Kpi label="Finished" value={String(totals.completed)} />
            <Kpi label="Stopped early" value={String(totals.stopped)} />
          </>
        ) : (
          <>
            <div className="adWf__note"><Info aria-hidden="true" /><span>Each person goes through once, even if the tag is added again.</span></div>
            <div className="ad__f">
              <span className="ad__fl" id="adWf-start">Starts when</span>
              <Pick labelledBy="adWf-start" value={meta.triggerKind} onChange={(v) => setMeta({ triggerKind: v === "tag_added" ? "tag_added" : "new_contact" })}
                options={[{ value: "new_contact", label: "Someone becomes a contact" }, { value: "tag_added", label: "A tag is added" }]} />
            </div>
            {meta.triggerKind === "tag_added" ? <TagField label="Tag" value={meta.triggerValue} tags={tags} onChange={(triggerValue) => setMeta({ triggerValue })} /> : null}
            <div>
              <h3>This automation is</h3>
              <Seg label="Kind of automation" value={meta.kind} options={[["marketing", "Marketing"], ["service", "Service"]]} onChange={(kind) => setMeta({ kind })} />
              <p className="adWf__hint" style={{ marginTop: ".5rem" }}>{meta.kind === "marketing"
                ? "Only people who asked to hear from us. Anyone who asked to stop is skipped."
                : "Follow-up to people we work with. Still skips anyone who asked to stop, and every email has an unsubscribe link."}</p>
            </div>
          </>
        )}
      </div>
      <footer className="adWf__pf"><span /><button type="button" className="ad__btn ad__btn--primary" onClick={onClose}>Done</button></footer>
    </>
  );
}

