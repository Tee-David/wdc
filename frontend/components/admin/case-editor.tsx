"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Check, ImageUp, Loader2, Plus, Save, Send, Trash2, X } from "lucide-react";
import { saveCaseStudy } from "@/lib/admin/work-actions";
import { CASE_KINDS, cleanCase, kindForService, LIMITS, slugifyCase, type CaseKind } from "@/lib/work-def";
import { uploadToMedia } from "./media-upload";
import { toast } from "./toast";
import type { CaseStudy } from "@/lib/work";
import "./case-editor.css";
import { Pick } from "@/components/admin/pick";

type Svc = { slug: CaseStudy["category"]; label: string };
type Draft = {
  kind: CaseKind; category: CaseStudy["category"]; also: CaseStudy["category"][];
  client: string; sector: string; location: string; slug: string;
  title: string; summary: string; about: string; brief: string; approach: string;
  did: string; list: string[]; url: string;
  palette: { hex: string; name: string }[]; quote: string; quoteFrom: string;
  cover: string; coverAlt: string; gallery: { src: string; alt: string }[];
};

const STEPS = ["What and who", "The story", "The detail", "Pictures", "Check and publish"] as const;

function toDraft(c: (CaseStudy & { kind?: CaseKind }) | null, kind: CaseKind | undefined): Draft {
  const k = kind ?? (c ? (c.palette?.length ? "identity" : /season/i.test(c.stackLabel ?? "") ? "campaign" : "build") : "build");
  return {
    kind: k, category: c?.category ?? "web", also: (c?.categories ?? []).filter((s) => s !== c?.category),
    client: c?.client ?? "", sector: c?.sector ?? "", location: c?.location ?? "Nigeria", slug: c?.slug ?? "",
    title: c?.title ?? "", summary: c?.summary ?? "", about: c?.about ?? "", brief: c?.brief ?? "", approach: c?.approach ?? "",
    did: (c?.did ?? []).join("\n"), list: c?.stack ?? [], url: c?.url ?? "",
    palette: c?.palette ?? [], quote: c?.quote?.text ?? "", quoteFrom: c?.quote?.from ?? "",
    cover: c?.cover ?? "", coverAlt: c?.coverAlt ?? (c?.client ? `${c.client}: ${c.title}` : ""),
    gallery: (c?.gallery ?? []).map((src, i) => ({ src, alt: c?.galleryAlt?.[i] ?? (c?.client ? `${c.client}: the delivered work` : "") })),
  };
}

/** The draft in the shape the server's `cleanCase` reads. */
const toInput = (d: Draft) => ({
  kind: d.kind, category: d.category, categories: [d.category, ...d.also], slug: d.slug || d.client,
  client: d.client, sector: d.sector, location: d.location,
  title: d.title, summary: d.summary, about: d.about, brief: d.brief, approach: d.approach,
  did: d.did, stack: d.list, url: d.url,
  palette: d.palette, quote: { text: d.quote, from: d.quoteFrom },
  cover: d.cover, coverAlt: d.coverAlt, gallery: d.gallery.map((g) => g.src), galleryAlt: d.gallery.map((g) => g.alt),
});

/**
 * THE CASE STUDY EDITOR (artifact: "WDC Case Studies"). Five short steps, a
 * preview of the page beside them, and the same checks the server runs, so
 * what it says is missing is what would stop it going live. The kind decides
 * which fields show; the service decides where it is filed.
 */
export function CaseEditor({ initial, kind, originalSlug, services, bucket, canPublish, ours }: {
  initial: (CaseStudy & { kind?: CaseKind }) | null;
  kind?: CaseKind;
  originalSlug?: string;
  services: Svc[];
  bucket?: string;
  canPublish: boolean;
  /** The site's own work pictures, to pick instead of uploading. */
  ours: string[];
}) {
  const router = useRouter();
  const [d, setD] = useState<Draft>(() => toDraft(initial, kind));
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState<"" | "save" | "publish">("");
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const k = CASE_KINDS[d.kind];
  const svcLabel = (s: string) => services.find((x) => x.slug === s)?.label ?? s;
  const address = `/work/${d.category}/${originalSlug || slugifyCase(d.slug || d.client) || "name"}`;
  const live = useMemo(() => cleanCase(toInput(d), { bucket }).problems, [d, bucket]);

  const save = async (publish: boolean) => {
    setBusy(publish ? "publish" : "save");
    const r = await saveCaseStudy({ originalSlug, data: toInput(d), publish }).catch(() => null);
    setBusy("");
    if (!r) { toast("That could not be saved. Check your connection and try again.", "bad"); return; }
    toast(r.message ?? (r.ok ? "Saved." : "Not saved."), r.ok ? "good" : "bad");
    if (r.ok && !originalSlug && r.slug) router.replace(`/admin/blog/work/${r.slug}`);
    else if (r.ok) router.refresh();
  };

  return (
    <div className="ce">
      <div className="ad__panel ce__main">
        <ol className="ce__steps" aria-label="Steps">
          {STEPS.map((s, i) => (
            <li key={s}>
              <button type="button" className={`ce__step${i < step ? " is-done" : ""}`} aria-current={i === step ? "step" : undefined} onClick={() => setStep(i)}>
                <span className="ce__dot" aria-hidden="true">{i < step ? <Check /> : i + 1}</span>{s}
              </button>
            </li>
          ))}
        </ol>

        <div className="ce__body">
          {step === 0 ? (
            <>
              <fieldset className="ce__f">
                <legend>What kind of work is it?</legend>
                <div className="ce__kinds">
                  {(Object.keys(CASE_KINDS) as CaseKind[]).map((key) => (
                    <label key={key} className={`ce__kind${d.kind === key ? " is-on" : ""}`}>
                      <input type="radio" name="kind" value={key} checked={d.kind === key} onChange={() => set("kind", key)} />
                      <b>{CASE_KINDS[key].label}</b><small>{CASE_KINDS[key].eg}</small>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="ce__two">
                <div className="ce__f">
                  <label htmlFor="ce-cat">Service it lives under</label>
                  <Pick id="ce-cat" value={d.category} options={services.map((s) => ({ value: s.slug, label: s.label }))} onChange={(raw) => {
                    const v = raw as Draft["category"];
                    setD((x) => ({ ...x, category: v, also: x.also.filter((s) => s !== v), kind: originalSlug ? x.kind : kindForService(v) }));
                  }} />
                  <small>Its address: {address}</small>
                </div>
                <fieldset className="ce__f">
                  <legend>Also listed under</legend>
                  <div className="ce__chips">
                    {services.filter((s) => s.slug !== d.category).map((s) => (
                      <label key={s.slug} className={`ce__chip${d.also.includes(s.slug) ? " is-on" : ""}`}>
                        <input type="checkbox" checked={d.also.includes(s.slug)}
                          onChange={(e) => set("also", e.target.checked ? [...d.also, s.slug] : d.also.filter((x) => x !== s.slug))} />
                        {s.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
              <div className="ce__three">
                <Text id="client" label="Client" value={d.client} onChange={(v) => set("client", v)} max={LIMITS.short} />
                <Text id="sector" label="Sector" value={d.sector} onChange={(v) => set("sector", v)} max={LIMITS.short} placeholder="e.g. Property data and listings" />
                <Text id="location" label="Location" value={d.location} onChange={(v) => set("location", v)} max={LIMITS.short} />
              </div>
              {!originalSlug ? (
                <Text id="slug" label="Address" value={d.slug} onChange={(v) => set("slug", slugifyCase(v))} max={60}
                  hint={`Leave empty to use the client's name. Fixed once published: ${address}`} placeholder={slugifyCase(d.client) || "client-name"} />
              ) : null}
            </>
          ) : null}

          {step === 1 ? (
            <>
              <Text id="title" label="Title" value={d.title} onChange={(v) => set("title", v)} max={LIMITS.title} count
                hint="One sentence about what was made." />
              <Text id="summary" label="Summary for the card" value={d.summary} onChange={(v) => set("summary", v)} max={LIMITS.summary} count
                hint="One line." />
              <Area id="about" label="About the client" value={d.about} onChange={(v) => set("about", v)} hint="Two or three sentences on who they are." />
              <Area id="brief" label="The brief" value={d.brief} onChange={(v) => set("brief", v)} hint="What we were asked to make. We do not narrate a client's problems for them." />
              <Area id="approach" label="The approach" value={d.approach} onChange={(v) => set("approach", v)} hint="How it was made, and why that way." />
            </>
          ) : null}

          {step === 2 ? (
            <>
              <Area id="did" label="What we did" value={d.did} onChange={(v) => set("did", v)} hint="One point per line. 3 to 10." rows={6} />
              <ListField label={k.listLabel} hint={k.listHint} value={d.list} onChange={(v) => set("list", v)} />
              {d.kind !== "identity" ? (
                <Text id="url" label={d.kind === "build" ? "Live address" : "Live address (only if it had its own page)"} value={d.url}
                  onChange={(v) => set("url", v)} max={300} placeholder="https://" hint="Shown as a Visit link. Starts with https://." />
              ) : null}
              {d.kind === "identity" ? (
                <>
                  <div className="ce__f">
                    <span className="ce__l">Colour palette</span>
                    <small>The hex and the name the brand guide uses. 2 to 8.</small>
                    {d.palette.map((p, i) => (
                      <div className="ce__sw" key={i}>
                        <input type="color" value={p.hex} aria-label={`Colour ${i + 1}`}
                          onChange={(e) => set("palette", d.palette.map((x, j) => (j === i ? { ...x, hex: e.target.value } : x)))} />
                        <input type="text" value={p.name} aria-label={`Name of colour ${i + 1}`} maxLength={40}
                          onChange={(e) => set("palette", d.palette.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                        <button type="button" className="ad__iconButton" aria-label={`Remove colour ${i + 1}`}
                          onClick={() => set("palette", d.palette.filter((_, j) => j !== i))}><X aria-hidden="true" /></button>
                      </div>
                    ))}
                    {d.palette.length < LIMITS.palette ? (
                      <button type="button" className="ad__btn ce__add" onClick={() => set("palette", [...d.palette, { hex: "#000065", name: "" }])}>
                        <Plus aria-hidden="true" /> Add a colour
                      </button>
                    ) : null}
                  </div>
                  <Area id="quote" label="Client line (optional)" value={d.quote} onChange={(v) => set("quote", v)}
                    hint="Copied exactly from something they wrote. Leave it empty rather than write one." rows={3} />
                  {d.quote.trim() ? <Text id="quoteFrom" label="Where it comes from" value={d.quoteFrom} onChange={(v) => set("quoteFrom", v)} max={80} placeholder="Brand guideline, positioning statement" /> : null}
                </>
              ) : null}
            </>
          ) : null}

          {step === 3 ? (
            <>
              <PictureField label="Cover picture" value={d.cover} onChange={(v) => set("cover", v)} ours={ours} />
              <Text id="coverAlt" label="Describe the cover" value={d.coverAlt} onChange={(v) => set("coverAlt", v)} max={LIMITS.alt}
                hint="For people who cannot see it: what is in the picture." />
              <Gallery label={k.picsLabel} min={k.pics[0]} max={k.pics[1]} value={d.gallery} onChange={(v) => set("gallery", v)} ours={ours} />
            </>
          ) : null}

          {step === 4 ? (
            <>
              <div className="ce__check" role="status">
                {live.length ? (
                  <>
                    <b>{live.length} thing{live.length === 1 ? "" : "s"} to finish before it can go live</b>
                    <ul>{live.map((p) => <li key={p}>{p}</li>)}</ul>
                    <small>You can save a draft now and come back to these.</small>
                  </>
                ) : <b><Check aria-hidden="true" /> Everything needed is there.</b>}
              </div>
              <dl className="ce__where">
                <div><dt>Its page</dt><dd>{address}</dd></div>
                <div><dt>Listed on</dt><dd>{[d.category, ...d.also].map(svcLabel).join(", ")}</dd></div>
              </dl>
              {!canPublish ? <p className="ad__dim">Save the draft; the owner publishes it.</p> : null}
            </>
          ) : null}
        </div>

        <div className="ce__foot">
          <button type="button" className="ad__btn" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</button>
          <span className="ce__footR">
            <button type="button" className="ad__btn" disabled={Boolean(busy)} onClick={() => void save(false)}>
              {busy === "save" ? <Loader2 className="ad__spin" aria-hidden="true" /> : <Save aria-hidden="true" />} Save draft
            </button>
            {step < STEPS.length - 1 ? (
              <button type="button" className="ad__btn ad__btn--primary" onClick={() => setStep((s) => s + 1)}>Next</button>
            ) : canPublish ? (
              <button type="button" className="ad__btn ad__btn--primary" disabled={Boolean(busy) || live.length > 0} onClick={() => void save(true)}>
                {busy === "publish" ? <Loader2 className="ad__spin" aria-hidden="true" /> : <Send aria-hidden="true" />} Publish
              </button>
            ) : null}
          </span>
        </div>
      </div>

      <aside className="ad__panel ce__pv" aria-label="Preview of the page">
        <div className="ce__pvH"><span>Preview</span><span className="ad__pill ad__pill--brand">{k.label}</span></div>
        <div className="ce__hero">
          <span>{svcLabel(d.category)} · {d.client || "Client"}</span>
          <b>{d.title || "Your title"}</b>
          <p>{d.summary || "The one-line summary."}</p>
        </div>
        {d.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="ce__cover" src={d.cover} alt={d.coverAlt} />
        ) : null}
        <div className="ce__pvB">
          <small>{[d.sector, d.location].filter(Boolean).join(" · ")}{d.url && d.kind !== "identity" ? " · Visit site" : ""}</small>
          <h4>The brief</h4><p>{d.brief || <i>Not written yet</i>}</p>
          <h4>What we did</h4>
          {d.did.trim() ? <ul>{d.did.split("\n").filter((l) => l.trim()).map((l, i) => <li key={i}>{l}</li>)}</ul> : <p><i>Nothing listed yet</i></p>}
          <h4>{k.listLabel}</h4>
          <div className="ce__chips">{d.list.length ? d.list.map((x) => <span key={x} className="ce__chip">{x}</span>) : <i>None yet</i>}</div>
          {d.kind === "identity" && d.palette.length ? (
            <><h4>Palette</h4><div className="ce__pal">{d.palette.map((p, i) => <span key={i}><i style={{ background: p.hex }} />{p.name || p.hex}</span>)}</div></>
          ) : null}
          {d.kind === "identity" && d.quote.trim() ? <><h4>In their words</h4><blockquote>{d.quote}<small>{d.quoteFrom}</small></blockquote></> : null}
          {d.gallery.length ? (
            <div className="ce__thumbs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {d.gallery.map((g) => <img key={g.src} src={g.src} alt={g.alt} />)}
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function Text({ id, label, value, onChange, max, hint, placeholder, count }: {
  id: string; label: string; value: string; onChange: (v: string) => void; max: number; hint?: string; placeholder?: string; count?: boolean;
}) {
  const over = count && value.length > max;
  return (
    <div className={`ce__f${over ? " is-bad" : ""}`}>
      <label htmlFor={`ce-${id}`}>{label}</label>
      {hint || count ? <small id={`ce-${id}-h`}>{count ? `${value.length}/${max} · ` : ""}{hint}</small> : null}
      <input id={`ce-${id}`} type="text" value={value} placeholder={placeholder} maxLength={count ? max + 40 : max}
        aria-describedby={hint || count ? `ce-${id}-h` : undefined} aria-invalid={over || undefined}
        onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Area({ id, label, value, onChange, hint, rows = 4 }: { id: string; label: string; value: string; onChange: (v: string) => void; hint?: string; rows?: number }) {
  return (
    <div className="ce__f">
      <label htmlFor={`ce-${id}`}>{label}</label>
      {hint ? <small id={`ce-${id}-h`}>{hint}</small> : null}
      <textarea id={`ce-${id}`} rows={rows} value={value} maxLength={LIMITS.long} aria-describedby={hint ? `ce-${id}-h` : undefined} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function ListField({ label, hint, value, onChange }: { label: string; hint: string; value: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState("");
  const add = () => {
    const v = text.trim();
    if (v && !value.includes(v) && value.length < LIMITS.list) onChange([...value, v]);
    setText("");
  };
  return (
    <div className="ce__f">
      <label htmlFor="ce-list">{label}</label>
      <small id="ce-list-h">{hint} Press Enter to add.</small>
      {value.length ? (
        <div className="ce__chips">
          {value.map((x) => (
            <button key={x} type="button" className="ce__chip is-on" aria-label={`Remove ${x}`} onClick={() => onChange(value.filter((y) => y !== x))}>
              {x} <X aria-hidden="true" />
            </button>
          ))}
        </div>
      ) : null}
      <div className="ce__addRow">
        <input id="ce-list" type="text" value={text} maxLength={60} aria-describedby="ce-list-h" placeholder="Add one"
          onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <button type="button" className="ad__btn" onClick={add}><Plus aria-hidden="true" /> Add</button>
      </div>
    </div>
  );
}

function useUpload() {
  const [state, setState] = useState<{ busy?: boolean; error?: string }>({});
  const up = async (f: File | undefined): Promise<string | null> => {
    if (!f) return null;
    if (!f.type.startsWith("image/")) { setState({ error: "That is not a picture. Use a JPG, PNG, WebP or AVIF." }); return null; }
    setState({ busy: true });
    const done = await uploadToMedia(f);
    if (!done.ok) { setState({ error: done.error }); return null; }
    setState({});
    return done.url;
  };
  return { state, up };
}

function Ours({ ours, onPick }: { ours: string[]; onPick: (src: string) => void }) {
  return (
    <details className="ce__ours">
      <summary>Or choose one of our pictures</summary>
      <div className="ce__oursGrid">
        {ours.map((src) => (
          <button key={src} type="button" onClick={(e) => { onPick(src); e.currentTarget.closest("details")?.removeAttribute("open"); }} aria-label={`Use ${src.split("/").pop()}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" loading="lazy" />
          </button>
        ))}
      </div>
    </details>
  );
}

function PictureField({ label, value, onChange, ours }: { label: string; value: string; onChange: (v: string) => void; ours: string[] }) {
  const { state, up } = useUpload();
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className={`ce__f${state.error ? " is-bad" : ""}`}>
      <span className="ce__l">{label}</span>
      <div className={`ce__drop${value ? " has-pic" : ""}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={async (e) => { e.preventDefault(); const u = await up(e.dataTransfer.files?.[0]); if (u) onChange(u); }}>
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" />
            <span className="ce__dropActs">
              <button type="button" className="ad__btn" onClick={() => input.current?.click()}><ImageUp aria-hidden="true" /> Replace</button>
              <button type="button" className="ad__btn" onClick={() => onChange("")}><Trash2 aria-hidden="true" /> Remove</button>
            </span>
          </>
        ) : (
          <button type="button" className="ce__dropBtn" onClick={() => input.current?.click()} disabled={state.busy}>
            {state.busy ? <Loader2 className="ad__spin" aria-hidden="true" /> : <ImageUp aria-hidden="true" />}
            <b>{state.busy ? "Uploading" : "Click to upload, or drop a picture here"}</b>
            <small>JPG, PNG, WebP or AVIF</small>
          </button>
        )}
        <input ref={input} type="file" hidden accept="image/png,image/jpeg,image/webp,image/avif"
          onChange={async (e) => { const u = await up(e.target.files?.[0]); if (u) onChange(u); e.target.value = ""; }} />
      </div>
      {state.error ? <small className="ce__err" role="alert">{state.error}</small> : null}
      <Ours ours={ours} onPick={onChange} />
    </div>
  );
}

function Gallery({ label, min, max, value, onChange, ours }: {
  label: string; min: number; max: number; value: { src: string; alt: string }[]; onChange: (v: { src: string; alt: string }[]) => void; ours: string[];
}) {
  const { state, up } = useUpload();
  const input = useRef<HTMLInputElement>(null);
  const add = (src: string) => { if (value.length < max && !value.some((g) => g.src === src)) onChange([...value, { src, alt: "" }]); };
  const move = (i: number, by: number) => {
    const n = [...value]; const [x] = n.splice(i, 1); n.splice(i + by, 0, x); onChange(n);
  };
  return (
    <div className={`ce__f${state.error ? " is-bad" : ""}`}>
      <span className="ce__l">{label}</span>
      <small>{min ? `${min} to ${max}` : `Up to ${max}`}. Each needs a short description. Use the arrows to change the order.</small>
      {value.map((g, i) => (
        <div className="ce__gal" key={g.src}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={g.src} alt="" />
          <input type="text" value={g.alt} maxLength={LIMITS.alt} aria-label={`Describe picture ${i + 1}`} placeholder="What is in this picture?"
            onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} />
          <span className="ce__galActs">
            <button type="button" className="ad__iconButton" aria-label={`Move picture ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp aria-hidden="true" /></button>
            <button type="button" className="ad__iconButton" aria-label={`Move picture ${i + 1} down`} disabled={i === value.length - 1} onClick={() => move(i, 1)}><ArrowDown aria-hidden="true" /></button>
            <button type="button" className="ad__iconButton" aria-label={`Remove picture ${i + 1}`} onClick={() => onChange(value.filter((_, j) => j !== i))}><Trash2 aria-hidden="true" /></button>
          </span>
        </div>
      ))}
      {value.length < max ? (
        <div className="ce__addRow">
          <button type="button" className="ad__btn" disabled={state.busy} onClick={() => input.current?.click()}>
            {state.busy ? <Loader2 className="ad__spin" aria-hidden="true" /> : <ImageUp aria-hidden="true" />} {state.busy ? "Uploading" : "Upload a picture"}
          </button>
          <input ref={input} type="file" hidden accept="image/png,image/jpeg,image/webp,image/avif"
            onChange={async (e) => { const u = await up(e.target.files?.[0]); if (u) add(u); e.target.value = ""; }} />
        </div>
      ) : null}
      {state.error ? <small className="ce__err" role="alert">{state.error}</small> : null}
      {value.length < max ? <Ours ours={ours.filter((o) => !value.some((g) => g.src === o))} onPick={add} /> : null}
    </div>
  );
}
