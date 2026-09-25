"use client";

import { useId, useState } from "react";
import { FileUp, Loader2, X } from "lucide-react";
import SelectField from "@/components/onboarding/select-field";
import {
  ADDRESS_PARTS, checkAnswers, COUNTRIES, FILE_MAX_BYTES, FILE_TYPES, LIMITS, visible,
  type Answer, type Answers, type CustomField, type CustomFormDef, type FileAnswer,
} from "@/lib/forms/custom-def";
import "@/components/contact/contact.css";
import "./custom-form.css";

const extOf = (name: string) => name.match(/\.([a-zA-Z0-9]{1,8})$/)?.[1]?.toLowerCase() ?? "";
const ACCEPT = Object.keys(FILE_TYPES).map((e) => `.${e}`).join(",");

/**
 * A FORM BUILT IN THE ADMIN, as a visitor fills it in (/f/<address>), and as
 * the builder previews it. Questions appear and disappear with their
 * conditions; every answer is checked here with the same rules the server
 * uses (lib/forms/custom-def.ts), and again there. Files go straight to our
 * bucket with a signed link before the form is sent.
 */
export function CustomFormView({ def, slug, preview }: { def: CustomFormDef; slug?: string; preview?: boolean }) {
  const [answers, setAnswers] = useState<Answers>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [message, setMessage] = useState("");
  const [trap, setTrap] = useState("");
  const id = useId();

  const set = (f: CustomField, v: Answer) => {
    setAnswers((a) => ({ ...a, [f.id]: v }));
    if (errors[f.id]) setErrors((e) => { const n = { ...e }; delete n[f.id]; return n; });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (preview) { setMessage("This is a preview. Publish the form to take entries."); return; }
    const checked = checkAnswers(def, answers);
    setErrors(checked.errors);
    if (Object.keys(checked.errors).length) {
      setMessage("Some answers need another look.");
      document.getElementById(`${id}-${Object.keys(checked.errors)[0]}`)?.focus();
      return;
    }
    setState("sending"); setMessage("");
    const r = await fetch(`/api/forms/${slug}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: checked.answers, website: trap }),
    }).then(async (x) => ({ ok: x.ok, body: await x.json().catch(() => ({})) })).catch(() => null);
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
    return <div className="cf-done" role="status"><b>Sent.</b><p>{message}</p></div>;
  }

  return (
    <form className="cf" onSubmit={submit} noValidate aria-describedby={message ? `${id}-msg` : undefined}>
      {def.intro ? <p className="cf-intro">{def.intro}</p> : null}
      {def.fields.filter((f) => visible(f, answers)).map((f) => (
        f.type === "heading"
          ? <h2 key={f.id} className="cf-h">{f.label}{f.help ? <small>{f.help}</small> : null}</h2>
          : <Field key={f.id} f={f} id={`${id}-${f.id}`} value={answers[f.id]} error={errors[f.id]} onChange={(v) => set(f, v)} slug={slug} preview={preview} />
      ))}
      {/* A field no person sees; a bot fills it in. */}
      <label className="ct-trap" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} name="website" /></label>
      <div className="cf-foot">
        <button type="submit" className="pv-btn pv-btn--accent" disabled={state === "sending"}>
          {state === "sending" ? <Loader2 className="cf-spin" aria-hidden="true" /> : null}
          {state === "sending" ? "Sending" : def.submitLabel}
        </button>
        {message ? <p id={`${id}-msg`} className="cf-msg" role="alert">{message}</p> : null}
      </div>
    </form>
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
      control = <FileField id={id} f={f} files={Array.isArray(value) && (value.length === 0 || typeof value[0] === "object") ? (value as FileAnswer[]) : []} onChange={onChange} slug={slug} preview={preview} describedBy={describedBy} />;
      break;
    default: {
      const type = f.type === "phone" ? "tel" : f.type === "text" ? "text" : f.type;
      control = (
        <input {...common} type={type} value={text} placeholder={f.placeholder} maxLength={LIMITS.text}
          min={f.type === "number" ? f.min : undefined} max={f.type === "number" ? f.max : undefined}
          inputMode={f.type === "number" ? "decimal" : f.type === "phone" ? "tel" : undefined}
          autoComplete={f.type === "email" ? "email" : f.type === "phone" ? "tel" : /name/i.test(f.label) ? "name" : undefined}
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

function FileField({ id, f, files, onChange, slug, preview, describedBy }: {
  id: string; f: CustomField; files: FileAnswer[]; onChange: (v: Answer) => void; slug?: string; preview?: boolean; describedBy?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
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
        .then((r) => r.json().then((b) => (r.ok ? b : { error: b.error ?? "The upload could not start." }))).catch(() => ({ error: "The upload could not start. Check your connection." }));
      if (grant.error) { setProblem(grant.error); setBusy(false); continue; }
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
    </div>
  );
}
