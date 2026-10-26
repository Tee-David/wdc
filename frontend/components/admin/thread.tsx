"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { ArrowDown, Camera, ChevronLeft, ChevronRight, Copy, CornerUpLeft, Download, FileText, Image as ImageIcon, ListPlus, Loader2, Paperclip, X } from "lucide-react";
import { toast } from "./toast";
import { signChatUpload, taskFromMessage } from "@/lib/messages/actions";

/**
 * A CONVERSATION THAT BEHAVES LIKE A CHAT APP. Swipe a message to the right
 * (or use its reply arrow, or hold it) to answer that message; the reply
 * carries a quote of it, and tapping the quote takes you back to the original.
 * When you have scrolled up, a button brings you back to the newest message.
 *
 * The lines arrive from the server with everything already worked out (day,
 * time, tag), so this only adds the gestures. What the reply points at is sent
 * as `replyTo` with the form, and the server checks it belongs to the same
 * conversation before saving it.
 */
export type ThreadLine = {
  id: string; who: string; mine: boolean; at: string; time: string; day?: string;
  body: string; initials: string; tag?: { text: string; tone: "live" | "flat" };
  /** Pictures and files on this message, with signed links (lib/messages/attachments.ts). */
  files?: { key: string; name: string; type: string; bytes: number; kind: "image" | "video" | "audio" | "file"; open: string; download: string }[];
  /** Only on a project note: a reply must keep the original's visibility. */
  visibility?: "client" | "internal";
  replyTo?: string | null;
};
type Picked = { id: string; who: string; body: string; visibility?: "client" | "internal" };

/** A file picked in the composer: uploading, ready (in the bucket), or refused. */
type Pending = { id: string; name: string; size: number; preview: string | null; state: "up" | "ready" | "bad"; key?: string; error?: string };
type CtxT = { reply: Picked | null; setReply: (p: Picked | null) => void; files: Pending[]; setFiles: React.Dispatch<React.SetStateAction<Pending[]>> };
const Ctx = createContext<CtxT>({ reply: null, setReply: () => {}, files: [], setFiles: () => {} });
export const useReply = () => useContext(Ctx);
/** True while a picked file is still on its way, or failed and has not been removed: Send waits rather than dropping it. */
export const useUploading = () => useContext(Ctx).files.some((f) => f.state !== "ready");

export function ThreadProvider({ children }: { children: React.ReactNode }) {
  const [reply, setReply] = useState<Picked | null>(null);
  const [files, setFiles] = useState<Pending[]>([]);
  return <Ctx.Provider value={{ reply, setReply, files, setFiles }}>{children}</Ctx.Provider>;
}

/** Clears what the composer was carrying once a message is sent. */
export function useSent() {
  const { setReply, setFiles } = useReply();
  return () => { setReply(null); setFiles((fs) => { fs.forEach((f) => f.preview && URL.revokeObjectURL(f.preview)); return []; }); };
}

const clip = (s: string, n = 140) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const SWIPE = 56;

function Bubble({ m, quoted, onReply, onJump, onTask }: { m: ThreadLine; quoted: ThreadLine | null | undefined; onReply: () => void; onJump: (id: string) => void; onTask?: () => void }) {
  const row = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; on: boolean; id: number } | null>(null);
  const hold = useRef<number>(0);
  const [dx, setDx] = useState(0);
  const [menu, setMenu] = useState(false);

  /* A touch swipe to the right answers the message. A mostly vertical move is
     a scroll and is left alone; the bubble only follows a sideways drag. */
  const down = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    drag.current = { x: e.clientX, y: e.clientY, on: false, id: e.pointerId };
    hold.current = window.setTimeout(() => { drag.current = null; setMenu(true); navigator.vibrate?.(8); }, 520);
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const x = e.clientX - d.x, y = e.clientY - d.y;
    if (Math.abs(x) > 6 || Math.abs(y) > 6) clearTimeout(hold.current);
    if (!d.on) {
      if (Math.abs(y) > 10 && Math.abs(y) > Math.abs(x)) { drag.current = null; return; }
      if (x > 10) { d.on = true; row.current?.setPointerCapture(d.id); }
    }
    if (d.on) setDx(Math.max(0, Math.min(84, x)));
  };
  const up = () => {
    clearTimeout(hold.current);
    if (drag.current?.on && dx >= SWIPE) onReply();
    drag.current = null;
    setDx(0);
  };
  useEffect(() => () => clearTimeout(hold.current), []);

  const copy = () => {
    void navigator.clipboard?.writeText(m.body).then(() => toast("Copied the message."), () => toast("Copying is blocked in this browser.", "bad"));
    setMenu(false);
  };

  return (
    <div id={`m-${m.id}`} className={`adConv__msg adTh__msg${m.mine ? " is-mine" : ""}`}>
      <span className={`adConv__av ad__av${m.mine ? "" : " ad__av--live"}`} aria-hidden="true">{m.initials}</span>
      <div className="adTh__lane">
        <span className="adTh__swipeIc" aria-hidden="true" style={{ opacity: Math.min(1, dx / SWIPE), transform: `scale(${0.6 + Math.min(1, dx / SWIPE) * 0.4})` }}><CornerUpLeft /></span>
        <div ref={row} className={`adConv__bubble adTh__bubble${dx ? " is-dragging" : ""}`} style={dx ? { transform: `translateX(${dx}px)` } : undefined}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onContextMenu={(e) => { if (e.nativeEvent instanceof PointerEvent && e.nativeEvent.pointerType !== "mouse") e.preventDefault(); }}>
          {m.replyTo ? (
            <button type="button" className="adTh__quote" onClick={() => quoted && onJump(quoted.id)} disabled={!quoted}
              aria-label={quoted ? `Replying to ${quoted.mine ? "you" : quoted.who}: ${clip(quoted.body, 80)}. Show the original.` : "Replying to an earlier message"}>
              <b>{quoted ? (quoted.mine ? "You" : quoted.who) : "Earlier message"}</b>
              <span>{quoted ? clip(quoted.body || (quoted.files?.length ? quoted.files.map((f) => f.name).join(", ") : "")) : "Further up the conversation."}</span>
            </button>
          ) : null}
          <p className="adConv__who"><b>{m.mine ? "You" : m.who}</b> <time dateTime={m.at}>{m.time}</time>{m.tag ? <span className={`ad__pill ad__pill--${m.tag.tone} adMx__vis`}>{m.tag.text}</span> : null}</p>
          {m.files?.length ? <MessageFiles files={m.files} /> : null}
          {m.body ? <p className="adConv__body">{m.body}</p> : null}
        </div>
        <button type="button" className="adTh__replyBtn" onClick={onReply} aria-label={`Reply to ${m.mine ? "your message" : m.who}`} title="Reply"><CornerUpLeft aria-hidden="true" /></button>
        {onTask && m.body ? <button type="button" className="adTh__replyBtn" onClick={onTask} aria-label="Make this message a task" title="Make it a task"><ListPlus aria-hidden="true" /></button> : null}
      </div>
      {menu ? (
        <div className="adTh__menu" role="menu" aria-label="Message actions">
          <button type="button" role="menuitem" onClick={() => { setMenu(false); onReply(); }}><CornerUpLeft aria-hidden="true" />Reply</button>
          <button type="button" role="menuitem" onClick={copy}><Copy aria-hidden="true" />Copy text</button>
          {onTask && m.body ? <button type="button" role="menuitem" onClick={() => { setMenu(false); onTask(); }}><ListPlus aria-hidden="true" />Make it a task</button> : null}
          <button type="button" role="menuitem" className="adTh__menuX" onClick={() => setMenu(false)} aria-label="Close the actions"><X aria-hidden="true" /></button>
        </div>
      ) : null}
    </div>
  );
}

/** The message list, with day separators, quotes, and the jump to the newest message. */
export function ThreadLines({ lines, label, taskProject }: { lines: ThreadLine[]; label: string; /** Set on a conversation tied to a project: a message can become a task on it. */ taskProject?: string }) {
  const { setReply } = useReply();
  const end = useRef<HTMLDivElement>(null);
  const [away, setAway] = useState(false);
  const byId = new Map(lines.map((l) => [l.id, l]));

  /* The newest message is "in view" when the marker after it is. Works whether
     the thread scrolls in its own box (wide screens) or with the page (phones). */
  useEffect(() => {
    const el = end.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setAway(!e?.isIntersecting), { rootMargin: "0px 0px 120px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const jump = useCallback((id: string) => {
    const el = document.getElementById(`m-${id}`);
    if (!el) return;
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "center", behavior: calm ? "auto" : "smooth" });
    el.classList.remove("is-flash");
    void el.offsetWidth;
    el.classList.add("is-flash");
    window.setTimeout(() => el.classList.remove("is-flash"), 1600);
  }, []);

  const pick = (m: ThreadLine) => {
    setReply({ id: m.id, who: m.mine ? "You" : m.who, body: m.body || (m.files?.length ? `${m.files.length === 1 ? "A file" : `${m.files.length} files`}: ${m.files.map((f) => f.name).join(", ")}` : ""), visibility: m.visibility });
    document.querySelector<HTMLTextAreaElement>(".adMx__reply textarea")?.focus({ preventScroll: true });
  };

  return (
    <div className="adTh">
      <ol className="adConv" aria-label={label}>
        {lines.map((m) => (
          <li key={m.id} className="adMx__item">
            {m.day ? <p className="adMx__day"><span>{m.day}</span></p> : null}
            <Bubble m={m} quoted={m.replyTo ? byId.get(m.replyTo) ?? null : undefined} onReply={() => pick(m)} onJump={jump}
              onTask={taskProject ? () => { void taskFromMessage(taskProject, m.body).then((r) => toast(r.message, r.ok ? "good" : "bad"), () => toast("The task could not be added.", "bad")); } : undefined} />
          </li>
        ))}
      </ol>
      <div ref={end} className="adTh__end" aria-hidden="true" />
      {away ? (
        <button type="button" className="adTh__down" onClick={() => end.current?.scrollIntoView({ block: "end", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })} aria-label="Go to the newest message">
          <ArrowDown aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

/** Sits inside a reply form: what you are answering, the hidden `replyTo`, and a cross to stop replying. */
export function ReplyingTo() {
  const { reply, setReply } = useReply();
  if (!reply) return null;
  return (
    <div className="adTh__replying">
      <input type="hidden" name="replyTo" value={reply.id} />
      <span className="adTh__replyingTxt"><b>Replying to {reply.who}</b><span>{clip(reply.body, 120)}</span></span>
      <button type="button" className="adTh__replyingX" onClick={() => setReply(null)} aria-label="Stop replying to this message"><X aria-hidden="true" /></button>
    </div>
  );
}

const size = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
type FileT = NonNullable<ThreadLine["files"]>[number];

/** Pictures as a grid (four shown, "+N" on the last), video and audio inline, everything else as a card with Download. */
export function MessageFiles({ files }: { files: FileT[] }) {
  const pics = files.filter((f) => f.kind === "image");
  const media = files.filter((f) => f.kind === "video" || f.kind === "audio");
  const docs = files.filter((f) => f.kind === "file");
  const [at, setAt] = useState<number | null>(null);
  const dlg = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (at !== null && dlg.current && !dlg.current.open) dlg.current.showModal(); }, [at]);
  const shown = pics.slice(0, 4), more = pics.length - 4;
  const cur = at !== null ? pics[at] : null;
  const go = (d: number) => setAt((a) => (a === null ? a : (a + d + pics.length) % pics.length));
  return (
    <div className="adTh__files">
      {pics.length ? (
        <div className={`adTh__pics adTh__pics--${Math.min(4, pics.length)}`}>
          {shown.map((f, i) => (
            <button type="button" key={f.key} className="adTh__pic" onClick={() => setAt(i)} aria-label={`Open ${f.name}${pics.length > 1 ? `, picture ${i + 1} of ${pics.length}` : ""}`} disabled={!f.open}>
              {/* eslint-disable-next-line @next/next/no-img-element -- a signed, private link that next/image cannot optimise */}
              {f.open ? <img src={f.open} alt="" loading="lazy" decoding="async" /> : <span className="adTh__picOff">{f.name}</span>}
              {i === 3 && more > 0 ? <span className="adTh__more" aria-hidden="true">+{more}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
      {media.map((f) => f.kind === "video"
        ? <video key={f.key} className="adTh__video" src={f.open} controls preload="metadata" aria-label={f.name} />
        : <audio key={f.key} className="adTh__audio" src={f.open} controls preload="metadata" aria-label={f.name} />)}
      {docs.map((f) => (
        <a key={f.key} className="adTh__doc" href={f.download || undefined} aria-disabled={!f.download || undefined}>
          <span className="adTh__docIc" aria-hidden="true"><FileText /></span>
          <span className="adTh__docTxt"><b>{f.name}</b><span>{(f.name.split(".").pop() ?? "").toUpperCase()} · {size(f.bytes)}</span></span>
          <Download className="adTh__docDl" aria-hidden="true" />
          <span className="ad__sr">Download</span>
        </a>
      ))}
      {cur ? (
        <dialog ref={dlg} className="adTh__view" onClose={() => setAt(null)} aria-label={`${cur.name}, ${at! + 1} of ${pics.length}`}
          onKeyDown={(e) => { if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); }}
          onClick={(e) => { if (e.target === e.currentTarget) dlg.current?.close(); }}>
          <div className="adTh__viewBar">
            <span className="adTh__viewPos">{at! + 1} / {pics.length}</span>
            <strong>{cur.name}</strong>
            <a className="adTh__viewBtn" href={cur.download} aria-label={`Download ${cur.name}`}><Download aria-hidden="true" /></a>
            <button type="button" className="adTh__viewBtn adTh__viewX" onClick={() => dlg.current?.close()} aria-label="Close the picture"><X aria-hidden="true" /></button>
          </div>
          <div className="adTh__viewBody">
            {/* eslint-disable-next-line @next/next/no-img-element -- full size from the signed link */}
            <img src={cur.open} alt={cur.name} />
          </div>
          {pics.length > 1 ? (
            <div className="adTh__viewNav">
              <button type="button" className="adTh__viewBtn" onClick={() => go(-1)} aria-label="Previous picture"><ChevronLeft aria-hidden="true" /></button>
              <button type="button" className="adTh__viewBtn" onClick={() => go(1)} aria-label="Next picture"><ChevronRight aria-hidden="true" /></button>
            </div>
          ) : null}
        </dialog>
      ) : null}
    </div>
  );
}

const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm";
const DOC_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.zip,.ai,.psd,.mp3,.m4a,.wav";

/**
 * The composer's paperclip: Photos and video, Camera (phones), Document. Each
 * file goes straight to the bucket as soon as it is picked, so Send only waits
 * for whatever is still on its way; what is typed becomes the caption. Paste
 * a picture into the message box, or drop files on the composer, to do the same.
 */
export function ChatAttach({ threadKey }: { threadKey: string }) {
  const { files, setFiles } = useReply();
  const [menu, setMenu] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const photo = useRef<HTMLInputElement>(null), cam = useRef<HTMLInputElement>(null), doc = useRef<HTMLInputElement>(null);

  const add = useCallback((list: FileList | File[]) => {
    const picked = Array.from(list).slice(0, Math.max(0, 10 - files.length));
    if (list.length > picked.length) toast("Up to ten files go in one message.", "bad");
    for (const f of picked) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const preview = /^image\//.test(f.type) ? URL.createObjectURL(f) : null;
      setFiles((fs) => [...fs, { id, name: f.name, size: f.size, preview, state: "up" }]);
      void (async () => {
        const grant = await signChatUpload({ threadKey, filename: f.name, size: f.size }).catch(() => null);
        if (!grant?.ok) { setFiles((fs) => fs.map((x) => x.id === id ? { ...x, state: "bad", error: grant?.error ?? "The upload could not start. Check your connection." } : x)); return; }
        const put = await fetch(grant.url, { method: "PUT", headers: { "Content-Type": grant.contentType }, body: f }).then((r) => r.ok).catch(() => false);
        setFiles((fs) => fs.map((x) => x.id === id ? (put ? { ...x, state: "ready", key: grant.key } : { ...x, state: "bad", error: "The file store did not take it. Try again." }) : x));
      })();
    }
  }, [files.length, setFiles, threadKey]);

  /* Paste a picture into the message box, or drop files anywhere on the composer. */
  useEffect(() => {
    const form = wrap.current?.closest("form");
    if (!form) return;
    const paste = (e: ClipboardEvent) => { const fs = Array.from(e.clipboardData?.files ?? []); if (fs.length) { e.preventDefault(); add(fs); } };
    const over = (e: DragEvent) => { if (e.dataTransfer?.types.includes("Files")) { e.preventDefault(); form.classList.add("is-drop"); } };
    const leave = () => form.classList.remove("is-drop");
    const drop = (e: DragEvent) => { if (e.dataTransfer?.files.length) { e.preventDefault(); add(e.dataTransfer.files); } leave(); };
    form.addEventListener("paste", paste); form.addEventListener("dragover", over); form.addEventListener("dragleave", leave); form.addEventListener("drop", drop);
    return () => { form.removeEventListener("paste", paste); form.removeEventListener("dragover", over); form.removeEventListener("dragleave", leave); form.removeEventListener("drop", drop); };
  }, [add]);

  useEffect(() => {
    if (!menu) return;
    const out = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setMenu(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(false); };
    document.addEventListener("pointerdown", out); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", out); document.removeEventListener("keydown", esc); };
  }, [menu]);

  const remove = (id: string) => setFiles((fs) => fs.filter((x) => { if (x.id === id && x.preview) URL.revokeObjectURL(x.preview); return x.id !== id; }));
  const pick = (r: React.RefObject<HTMLInputElement | null>) => { setMenu(false); r.current?.click(); };
  const ready = files.filter((f) => f.state === "ready" && f.key).map((f) => ({ key: f.key, name: f.name }));

  return (
    <>
      <input type="hidden" name="attachments" value={ready.length ? JSON.stringify(ready) : ""} />
      {files.length ? (
        <ul className="adTh__tray" aria-label="Files to send">
          {files.map((f) => (
            <li key={f.id} className={`adTh__trayItem is-${f.state}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- a local preview of the picked file */}
              {f.preview ? <img src={f.preview} alt="" /> : <span className="adTh__trayIc" aria-hidden="true"><FileText /></span>}
              <span className="adTh__trayTxt"><b>{f.name}</b><span>{f.state === "up" ? "Uploading…" : f.state === "bad" ? f.error : size(f.size)}</span></span>
              {f.state === "up" ? <Loader2 className="ad__spin adTh__traySpin" aria-hidden="true" /> : null}
              <button type="button" className="adTh__trayX" onClick={() => remove(f.id)} aria-label={`Remove ${f.name}`}><X aria-hidden="true" /></button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="adTh__attach" ref={wrap}>
        <button type="button" className="adTh__clip" onClick={() => setMenu((m) => !m)} aria-label="Attach pictures or files" aria-haspopup="menu" aria-expanded={menu}>
          <Paperclip aria-hidden="true" />
        </button>
        {menu ? (
          <div className="adTh__attMenu" role="menu" aria-label="Attach">
            <span className="adTh__attGrab" aria-hidden="true" />
            <button type="button" role="menuitem" onClick={() => pick(photo)}><span className="adTh__attIc adTh__attIc--photo"><ImageIcon aria-hidden="true" /></span>Photos and video</button>
            <button type="button" role="menuitem" className="adTh__attCam" onClick={() => pick(cam)}><span className="adTh__attIc adTh__attIc--cam"><Camera aria-hidden="true" /></span>Camera</button>
            <button type="button" role="menuitem" onClick={() => pick(doc)}><span className="adTh__attIc adTh__attIc--doc"><FileText aria-hidden="true" /></span>Document</button>
          </div>
        ) : null}
        <input ref={photo} type="file" accept={PHOTO_ACCEPT} multiple hidden onChange={(e) => { if (e.target.files) add(e.target.files); e.target.value = ""; }} />
        <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { if (e.target.files) add(e.target.files); e.target.value = ""; }} />
        <input ref={doc} type="file" accept={DOC_ACCEPT} multiple hidden onChange={(e) => { if (e.target.files) add(e.target.files); e.target.value = ""; }} />
      </div>
    </>
  );
}
