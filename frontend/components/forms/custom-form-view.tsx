"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, FileUp, Loader2, X } from "lucide-react";
import { CONTACT_EMAIL } from "@/lib/site";
import SelectField from "@/components/onboarding/select-field";
import { DateInput } from "@/components/admin/pick";
import {
  ADDRESS_PARTS, checkAnswers, COUNTRIES, FILE_BY_EMAIL, FILE_MAX_BYTES, FILE_TYPES, LIMITS, visible,
  type Answer, type Answers, type CustomField, type CustomFormDef, type FileAnswer,
} from "@/lib/forms/custom-def";
import "@/components/contact/contact.css";
import "./custom-form.css";

const PhoneField = dynamic(() => import("@/components/onboarding/phone-field"), { ssr: false, loading: () => <div className="ct-phone-ph" aria-hidden="true" /> });
const extOf = (name: string) => name.match(/\.([a-zA-Z0-9]{1,8})$/)?.[1]?.toLowerCase() ?? "";
const ACCEPT = Object.keys(FILE_TYPES).map((e) => `.${e}`).join(",");

/**
 * A FORM BUILT IN THE ADMIN, as a visitor fills it in (/f/<address>), and as
 * the builder previews it. Questions appear and disappear with their
 * conditions; every answer is checked here with the same rules the server
 * uses (lib/forms/custom-def.ts), and again there. Files go straight to our
 * bucket with a signed link before the form is sent.
 */
export type Sender = (answers: Answers) => Promise<{ ok: true; message?: string } | { ok: false; error?: string; errors?: Record<string, string> }>;

/**
 * `send`, when given, replaces the post to /api/forms/<slug>: a form written in
 * code (/start) hands its answers to its own endpoint and keeps everything else
 * here, the checks, the screens and the done state.
 */
export function CustomFormView({ def, slug, preview, send, initial }: { def: CustomFormDef; slug?: string; preview?: boolean; send?: Sender; initial?: Answers }) {
  const [answers, setAnswers] = useState<Answers>(initial ?? {});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [message, setMessage] = useState("");
  const [trap, setTrap] = useState("");
  /* The form stopped taking entries while this person was filling it in. */
  const [closed, setClosed] = useState(false);
  const [copied, setCopied] = useState(false);
  const id = useId();

  /* THE CONVERSATION LAYOUT: the same questions, one or two to a screen. The
     screens are worked out from the answers so far, so a question that a
     condition hides never takes a screen of its own. */
  const talk = def.layout === "conversation";
  const per = def.perScreen === 2 ? 2 : 1;
  const asks = def.fields.filter((f) => f.type !== "heading" && visible(f, answers));
  const screens: CustomField[][] = [];
  for (let i = 0; i < asks.length; i += per) screens.push(asks.slice(i, i + per));
  const [step, setStep] = useState(0);
  const at = Math.min(step, Math.max(0, screens.length - 1));
  const here = screens[at] ?? [];
  const last = at >= screens.length - 1;
  const moved = useRef(false);
  const firstId = here[0]?.id;
  useEffect(() => {
    if (!talk || !moved.current || !firstId) return;
    document.getElementById(`${id}-${firstId}`)?.focus({ preventScroll: true });
  }, [talk, at, firstId, id]);
  const go = (to: number) => { moved.current = true; setMessage(""); setStep(Math.max(0, to)); };

  /* Everything typed, as plain text, so closing the form does not throw it
     away: "Question: answer" per line, files by name. */
  const asText = () => def.fields.filter((f) => f.type !== "heading" && visible(f, answers) && answers[f.id] !== undefined).map((f) => {
    const v = answers[f.id];
    const text = typeof v === "string" ? v : v.map((x) => (typeof x === "string" ? x : x.name)).join(", ");
    return `${f.label}: ${text}`;
  }).filter((line) => !line.endsWith(": ")).join("\n");
  const copy = async () => {
    try { await navigator.clipboard.writeText(`${def.title}\n\n${asText()}`); setCopied(true); }
    catch { setCopied(false); setMessage("Copying did not work here. Select the answers above and copy them by hand."); }
  };

  const set = (f: CustomField, v: Answer) => {
    setAnswers((a) => ({ ...a, [f.id]: v }));
    if (errors[f.id]) setErrors((e) => { const n = { ...e }; delete n[f.id]; return n; });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const checked = checkAnswers(def, answers);
    if (talk && !last) {
      /* Only this screen's answers are asked for yet. */
      const mine = Object.fromEntries(here.filter((f) => checked.errors[f.id]).map((f) => [f.id, checked.errors[f.id]]));
      setErrors(mine);
      if (Object.keys(mine).length) { setMessage("Some answers need another look."); document.getElementById(`${id}-${Object.keys(mine)[0]}`)?.focus(); return; }
      go(at + 1);
      return;
    }
    setErrors(checked.errors);
    if (preview && !Object.keys(checked.errors).length) { setMessage("This is a preview. Publish the form to take entries."); return; }
    if (talk && Object.keys(checked.errors).length) {
      /* Back to the first screen that has a problem. */
      const firstBad = screens.findIndex((s) => s.some((f) => checked.errors[f.id]));
      if (firstBad >= 0) go(firstBad);
      setMessage("Some answers need another look.");
      return;
    }
    if (Object.keys(checked.errors).length) {
      setMessage("Some answers need another look.");
      document.getElementById(`${id}-${Object.keys(checked.errors)[0]}`)?.focus();
      return;
    }
    setState("sending"); setMessage("");
    const r = send
      ? await send(checked.answers).then((x) => ({ ok: x.ok, status: x.ok ? 200 : 422, body: x.ok ? { message: x.message } : { error: x.error, errors: x.errors } })).catch(() => null)
      : await fetch(`/api/forms/${slug}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: checked.answers, website: trap }),
      }).then(async (x) => ({ ok: x.ok, status: x.status, body: await x.json().catch(() => ({})) })).catch(() => null);
    if (r && (r.status === 404 || r.status === 409)) {
      setState("idle");
      setClosed(true);
      setMessage("");
      return;
    }
    if (!r?.ok) {
      setState("idle");
      if (r?.body?.errors) setErrors(r.body.errors);
      setMessage(r?.body?.error ?? "Your answers could not be sent. Check your connection and try again.");
      return;
    }
    setState("done");
    setMessage(r.body.message ?? def.successMessage);
  };

  if (state === "done") {
    return <div className="cf-done" role="status"><b>Sent.</b><p>{message}</p><Link className="pv-btn pv-btn--line" href="/">Back to the site</Link></div>;
  }

  return (
    <>
    {/* Without JavaScript the form cannot check or send answers; say so and
        give the other way in, rather than wiping what someone typed. */}
    <noscript><p className="cf-msg">This form needs JavaScript. Turn it on and reload, or email {CONTACT_EMAIL}.</p></noscript>
    <form className={`cf${talk ? " cf--talk" : ""}`} onSubmit={submit} noValidate aria-describedby={message ? `${id}-msg` : undefined}>
      {talk ? (
        <>
          <div className="cf-prog">
            <div className="cf-prog__bar" role="progressbar" aria-label="Progress" aria-valuemin={1} aria-valuemax={screens.length} aria-valuenow={at + 1}>
              <span style={{ width: `${((at + 1) / Math.max(1, screens.length)) * 100}%` }} />
            </div>
            <span className="cf-prog__n">{at + 1} of {screens.length}</span>
          </div>
          {at === 0 && def.intro ? <p className="cf-intro">{def.intro}</p> : null}
          <div className="cf-screen" key={at}>
            {(() => {
              const before = def.fields.slice(0, def.fields.indexOf(here[0]));
              const head = [...before].reverse().find((x) => x.type === "heading");
              return head ? <p className="cf-kicker">{head.label}</p> : null;
            })()}
            {here.map((f) => (
              <Field key={f.id} f={f} id={`${id}-${f.id}`} value={answers[f.id]} error={errors[f.id]} onChange={(v) => set(f, v)} slug={slug} preview={preview} />
            ))}
          </div>
        </>
      ) : (
        <>
          {def.intro ? <p className="cf-intro">{def.intro}</p> : null}
          {def.fields.filter((f) => visible(f, answers)).map((f) => (
            f.type === "heading"
              ? <h2 key={f.id} className="cf-h">{f.label}{f.help ? <small>{f.help}</small> : null}</h2>
              : <Field key={f.id} f={f} id={`${id}-${f.id}`} value={answers[f.id]} error={errors[f.id]} onChange={(v) => set(f, v)} slug={slug} preview={preview} />
          ))}
        </>
      )}
      {/* A field no person sees; a bot fills it in. */}
      <label className="ct-trap" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} name="website" /></label>
      <div className="cf-foot">
        <div className="cf-acts" hidden={closed}>
          {talk && at > 0 ? (
            <button type="button" className="pv-btn pv-btn--line cf-back" onClick={() => go(at - 1)} disabled={state === "sending"}>
              <ArrowLeft aria-hidden="true" /> Back
            </button>
          ) : null}
          <button type="submit" className="pv-btn pv-btn--accent" disabled={state === "sending" || closed}>
            {state === "sending" ? <Loader2 className="cf-spin" aria-hidden="true" /> : null}
            {state === "sending" ? "Sending" : talk && !last ? "Next" : def.submitLabel}
          </button>
          {talk && !last && !here.some((f) => f.type === "textarea") ? <span className="cf-hint">or press <kbd>Enter</kbd></span> : null}
        </div>
        {message ? <p id={`${id}-msg`} className="cf-msg" role="alert">{message}</p> : null}
        {closed ? (
          <div className="cf-closed" role="alert">
            <b>This form stopped taking entries while you were filling it in.</b>
            <p>Your answers are still here. Copy them and send them to us another way, and we will pick it up from there.</p>
            <div className="cf-closed__acts">
              <button type="button" className="pv-btn pv-btn--accent" onClick={copy}>{copied ? "Copied" : "Copy my answers"}</button>
              <a className="pv-btn pv-btn--line" href="/contact">Contact us</a>
            </div>
          </div>
        ) : null}
      </div>
    </form>
    </>
  );
}

function Field({ f, id, value, error, onChange, slug, preview }: {
  f: CustomField; id: string; value: Answer | undefined; error?: string; onChange: (v: Answer) => void; slug?: string; preview?: boolean;
}) {
  const describedBy = [f.help ? `${id}-h` : "", error ? `${id}-e` : ""].filter(Boolean).join(" ") || undefined;
  const common = { id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy, required: f.required };
  const text = typeof value === "string" ? value : "";
  const label = <label htmlFor={id}>{f.label}{f.required ? <b aria-hidden="true"> *</b> : <i> (optional)</i>}</label>;
  let control: React.ReactNode;
  switch (f.type) {
    case "textarea":
      control = <textarea {...common} rows={5} maxLength={LIMITS.long} placeholder={f.placeholder} value={text} onChange={(e) => onChange(e.target.value)} />;
      break;
    case "country":
      control = <SelectField id={id} options={COUNTRIES} value={text} onChange={onChange} invalid={Boolean(error)} describedBy={describedBy} placeholder={f.placeholder || "Choose a country"} />;
      break;
    case "address": {
      const parts = Array.isArray(value) && (value.length === 0 || typeof value[0] === "string") ? (value as string[]) : [];
      const setPart = (i: number, v: string) => { const next = ADDRESS_PARTS.map((_, j) => parts[j] ?? ""); next[i] = v; onChange(next); };
      return (
        <fieldset className={`ct-f cf-address${error ? " is-bad" : ""}`} aria-describedby={describedBy}>
          <legend>{f.label}{f.required ? <b aria-hidden="true"> *</b> : <i> (optional)</i>}</legend>
          {f.help ? <small id={`${id}-h`} className="cf-help">{f.help}</small> : null}
          {ADDRESS_PARTS.map((p, i) => (
            <div key={p.key} className={`cf-address__part cf-address__part--${p.key}`}>
              <label htmlFor={i === 0 ? id : `${id}-${p.key}`}>{p.label}{f.required && p.required ? null : <i> (optional)</i>}</label>
              {p.key === "country"
                ? <SelectField id={`${id}-${p.key}`} options={COUNTRIES} value={parts[i] ?? ""} onChange={(v) => setPart(i, v)} invalid={Boolean(error)} placeholder="Choose a country" />
                : <input id={i === 0 ? id : `${id}-${p.key}`} type="text" value={parts[i] ?? ""} maxLength={200}
                    autoComplete={p.key === "street" ? "street-address" : p.key === "city" ? "address-level2" : "address-level1"}
                    aria-invalid={error ? true : undefined} onChange={(e) => setPart(i, e.target.value)} />}
            </div>
          ))}
          {error ? <small id={`${id}-e`} className="ct-error">{error}</small> : null}
        </fieldset>
      );
    }
    case "date":
      /* The site's own calendar, not the browser's (AGENTS.md). */
      control = (
        <div data-pick-skin="public">
          <DateInput id={id} value={text} onChange={onChange} invalid={Boolean(error)} describedBy={describedBy} required={f.required}
            placeholder={f.placeholder || "Pick a date"} />
        </div>
      );
      break;
    case "phone":
      control = <PhoneField id={id} value={text} onChange={onChange} invalid={Boolean(error)} describedBy={describedBy} />;
      break;
    case "select":
      control = <SelectField id={id} options={f.options ?? []} value={text} onChange={onChange} invalid={Boolean(error)} describedBy={describedBy} placeholder={f.placeholder || "Choose one"} />;
      break;
    case "radio":
    case "checkboxes": {
      const many = f.type === "checkboxes";
      const picked = many ? (Array.isArray(value) ? (value as string[]) : []) : [text];
      return (
        <fieldset className={`ct-f cf-choices${error ? " is-bad" : ""}`} aria-describedby={describedBy}>
          <legend>{f.label}{f.required ? <b aria-hidden="true"> *</b> : <i> (optional)</i>}</legend>
          {f.help ? <small id={`${id}-h`} className="cf-help">{f.help}</small> : null}
          {(f.options ?? []).map((o, i) => (
            <label key={o} className="cf-choice">
              <input id={i === 0 ? id : undefined} type={many ? "checkbox" : "radio"} name={id} value={o} checked={picked.includes(o)}
                onChange={(e) => onChange(many ? (e.target.checked ? [...picked, o] : picked.filter((x) => x !== o)) : o)} />
              <span>{o}</span>
            </label>
          ))}
          {error ? <small id={`${id}-e`} className="ct-error">{error}</small> : null}
        </fieldset>
      );
    }
    case "consent":
      return (
        <div className={`ct-f cf-consent${error ? " is-bad" : ""}`}>
          <label className="cf-choice">
            <input {...common} type="checkbox" checked={value === "Yes"} onChange={(e) => onChange(e.target.checked ? "Yes" : "")} />
            <span>{f.label}{f.required ? <b aria-hidden="true"> *</b> : null}</span>
          </label>
          {f.help ? <small id={`${id}-h`} className="cf-help">{f.help}</small> : null}
          {error ? <small id={`${id}-e`} className="ct-error">{error}</small> : null}
        </div>
      );
    case "file":
      control = <FileField id={id} f={f} files={Array.isArray(value) && (value.length === 0 || typeof value[0] === "object") ? (value as FileAnswer[]) : []} byEmail={value === FILE_BY_EMAIL} onChange={onChange} slug={slug} preview={preview} describedBy={describedBy} />;
      break;
    default: {
      const type = f.type === "text" ? "text" : f.type;
      control = (
        <input {...common} type={type} value={text} placeholder={f.placeholder} maxLength={LIMITS.text}
          min={f.type === "number" ? f.min : undefined} max={f.type === "number" ? f.max : undefined}
          inputMode={f.type === "number" ? "decimal" : undefined}
          autoComplete={f.type === "email" ? "email" : /name/i.test(f.label) ? "name" : undefined}
          onChange={(e) => onChange(e.target.value)} />
      );
    }
  }
  return (
    <div className={`ct-f${error ? " is-bad" : ""}`}>
      {label}
      {f.help ? <small id={`${id}-h`} className="cf-help">{f.help}</small> : null}
      {control}
      {error ? <small id={`${id}-e`} className="ct-error">{error}</small> : null}
    </div>
  );
}

function FileField({ id, f, files, byEmail, onChange, slug, preview, describedBy }: {
  id: string; f: CustomField; files: FileAnswer[]; byEmail: boolean; onChange: (v: Answer) => void; slug?: string; preview?: boolean; describedBy?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  /* Uploads unavailable (storage down or not set up): the visitor is never
     stuck on a required file. They can say they will email it, which answers
     the question, and untick it to try the upload again. */
  const [storageOff, setStorageOff] = useState(false);
  const add = async (list: FileList | null) => {
    if (!list?.length) return;
    setProblem("");
    const out = [...files];
    for (const file of [...list]) {
      if (out.length >= LIMITS.files) { setProblem(`Up to ${LIMITS.files} files.`); break; }
      if (!FILE_TYPES[extOf(file.name)]) { setProblem(`${file.name} is not a type this form takes: documents, spreadsheets, slides, pictures, text or zip.`); continue; }
      if (file.size > FILE_MAX_BYTES) { setProblem(`${file.name} is over ${FILE_MAX_BYTES / 1024 / 1024}MB.`); continue; }
      if (preview) { out.push({ key: `preview/${file.name}`, name: file.name, size: file.size }); continue; }
      setBusy(true);
      const grant = await fetch(`/api/forms/${slug}/upload`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: file.name, size: file.size }) })
        .then((r) => r.json().then((b) => (r.ok ? b : { error: b.error ?? "The upload could not start.", off: r.status === 503 }))).catch(() => ({ error: "The upload could not start. Check your connection." }));
      if (grant.error) { setProblem(grant.error); setBusy(false); if (grant.off) { setStorageOff(true); break; } continue; }
      const put = await fetch(grant.url, { method: "PUT", headers: { "Content-Type": grant.contentType }, body: file }).then((r) => r.ok).catch(() => false);
      setBusy(false);
      if (!put) { setProblem(`${file.name} could not be uploaded. Try again, or send it by email instead.`); continue; }
      out.push({ key: grant.key, name: file.name, size: file.size });
    }
    onChange(out);
  };
  return (
    <div className="cf-files">
      <label className={`cf-drop${busy ? " is-busy" : ""}`}
        onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void add(e.dataTransfer.files); }}>
        {busy ? <Loader2 className="cf-spin" aria-hidden="true" /> : <FileUp aria-hidden="true" />}
        <span>{busy ? "Uploading" : files.length ? "Add another file" : (f.placeholder || "Choose a file, or drop it here")}</span>
        <input id={id} type="file" multiple accept={ACCEPT} aria-describedby={describedBy} disabled={busy}
          onChange={(e) => { void add(e.target.files); e.target.value = ""; }} />
      </label>
      {files.length ? (
        <ul className="cf-list">
          {files.map((x) => (
            <li key={x.key}>
              <span>{x.name} <small>({Math.max(1, Math.round(x.size / 1024))} KB)</small></span>
              <button type="button" aria-label={`Remove ${x.name}`} onClick={() => onChange(files.filter((y) => y.key !== x.key))}><X aria-hidden="true" /></button>
            </li>
          ))}
        </ul>
      ) : null}
      {problem ? <small className="ct-error" role="alert">{problem}</small> : null}
      {storageOff || byEmail ? (
        <label className="cf-choice cf-byEmail">
          <input type="checkbox" checked={byEmail} onChange={(e) => onChange(e.target.checked ? FILE_BY_EMAIL : [])} />
          <span>I&rsquo;ll email it to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> instead</span>
        </label>
      ) : null}
    </div>
  );
}
