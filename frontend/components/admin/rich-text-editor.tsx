"use client";

import { useEffect, useId, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold, Heading2, Heading3, ImagePlus, Italic, Link2, List, ListOrdered, Pilcrow, Quote, Redo2, Undo2, Upload, X,
} from "lucide-react";
import type { RichDoc } from "@/lib/blog-doc";
import { recordMediaUpload, signMediaUpload } from "@/lib/admin/media-actions";
import { checkMediaFile } from "@/lib/media-validate";

/**
 * The post body, written the way people write: a page with a toolbar.
 *
 * TipTap, configured down to what the public page renders (`lib/blog-doc.ts`):
 * paragraphs, section headings (h2) and sub-headings (h3), bullet and numbered
 * lists, quotes, links, bold, italic and pictures. Nothing else is switched
 * on, so nothing appears here that would silently vanish on save -- no h1
 * (the headline is the page's h1), no underline, no code, no colours.
 *
 * Link and image are small panels under the toolbar rather than browser
 * prompts: they can carry a label, they stay inside the viewport on a phone,
 * and an image's description is asked for at the moment it is inserted.
 *
 * Pictures go through the media library's own two steps (a signed PUT
 * straight to the bucket, then the server checks the bucket really has it),
 * so a post never points at a file the library does not know about.
 */

const PictureWithSize = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: null },
      height: { default: null },
    };
  },
});

/** The natural size of a picture, so the page can reserve its space. */
function measure(src: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve(img.naturalWidth ? { width: img.naturalWidth, height: img.naturalHeight } : null);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function Tool({ label, on, disabled, onClick, children }: {
  label: string; on?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      type="button" className={`adRte__tool${on ? " is-on" : ""}`}
      aria-label={label} title={label} aria-pressed={on ?? undefined} disabled={disabled}
      /* Keep the selection: a mousedown on a button would otherwise move focus
         out of the text and the command would run on nothing. */
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function LinkPanel({ editor, close }: { editor: Editor; close: () => void }) {
  const id = useId();
  const [href, setHref] = useState<string>(() => editor.getAttributes("link").href ?? "");
  const [error, setError] = useState("");
  const apply = () => {
    const value = href.trim();
    if (!value) { editor.chain().focus().extendMarkRange("link").unsetLink().run(); close(); return; }
    const ok = /^(https?:\/\/|mailto:|\/(?!\/)|#)/i.test(value);
    const full = ok ? value : `https://${value}`;
    try { if (!full.startsWith("/") && !full.startsWith("#")) new URL(full); } catch { setError("That does not look like an address."); return; }
    const chain = editor.chain().focus().extendMarkRange("link");
    if (editor.state.selection.empty && !editor.isActive("link")) chain.insertContent({ type: "text", text: value, marks: [{ type: "link", attrs: { href: full } }] }).run();
    else chain.setLink({ href: full }).run();
    close();
  };
  return (
    <div className="adRte__panel" role="group" aria-label="Link">
      <label htmlFor={`${id}-href`}>Link address</label>
      <div className="adRte__panelRow">
        <input
          id={`${id}-href`} type="url" inputMode="url" autoFocus placeholder="https://example.com or /services/web"
          value={href} onChange={(e) => { setHref(e.target.value); setError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); apply(); } if (e.key === "Escape") close(); }}
        />
        <button type="button" className="ad__btn ad__btn--primary" onClick={apply}>Apply</button>
        {editor.isActive("link") ? (
          <button type="button" className="ad__btn" onClick={() => { editor.chain().focus().extendMarkRange("link").unsetLink().run(); close(); }}>Remove</button>
        ) : null}
        <button type="button" className="ad__btn adRte__close" aria-label="Close" onClick={close}><X aria-hidden="true" /></button>
      </div>
      {error ? <small className="ad__fe" role="alert">{error}</small> : <small className="ad__fh">Select words first to turn them into a link, or type an address to insert it.</small>}
    </div>
  );
}

function ImagePanel({ editor, close }: { editor: Editor; close: () => void }) {
  const id = useId();
  const [src, setSrc] = useState("");
  const [alt, setAlt] = useState("");
  const [state, setState] = useState<{ busy?: string; error?: string }>({});
  const file = useRef<HTMLInputElement>(null);

  const upload = async (f: File) => {
    const local = checkMediaFile(f.name, f.size);
    if (!local.ok) return setState({ error: local.error });
    setState({ busy: "Uploading..." });
    const grant = await signMediaUpload({ filename: f.name, size: f.size }).catch(() => null);
    if (!grant?.ok) return setState({ error: grant?.error ?? "The upload could not be started. Check your connection and try again." });
    const put = await fetch(grant.url, { method: "PUT", headers: { "Content-Type": grant.contentType }, body: f }).then((r) => r.ok).catch(() => false);
    if (!put) return setState({ error: "The file store did not accept the upload. If this keeps happening, check the bucket's CORS policy allows this site." });
    const recorded = await recordMediaUpload({ key: grant.key, filename: f.name }).catch(() => null);
    if (!recorded?.ok || !recorded.item.url) return setState({ error: (recorded && !recorded.ok && recorded.error) || "The file arrived but could not be listed. Try again." });
    setSrc(recorded.item.url);
    setState({});
  };

  const insert = async () => {
    const value = src.trim();
    if (!value) return setState({ error: "Upload a picture or paste its address first." });
    if (!alt.trim()) return setState({ error: "Describe the picture for somebody who cannot see it." });
    setState({ busy: "Checking the picture..." });
    const size = await measure(value);
    if (!size) return setState({ error: "That picture could not be loaded. Check the address." });
    editor.chain().focus().insertContent({ type: "image", attrs: { src: value, alt: alt.trim(), ...size } }).run();
    close();
  };

  return (
    <div className="adRte__panel" role="group" aria-label="Picture">
      <div className="adRte__panelRow">
        <label className="ad__btn adRte__upload">
          <Upload aria-hidden="true" /> Upload a picture
          <input ref={file} type="file" accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
                 onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); if (file.current) file.current.value = ""; }} />
        </label>
        <button type="button" className="ad__btn adRte__close" aria-label="Close" onClick={close}><X aria-hidden="true" /></button>
      </div>
      <label htmlFor={`${id}-src`}>Or its address</label>
      <input id={`${id}-src`} type="url" inputMode="url" placeholder="/hero/web.jpg, or an address in our media library"
             value={src} onChange={(e) => { setSrc(e.target.value); setState({}); }} />
      <label htmlFor={`${id}-alt`}>Description<b aria-hidden="true"> *</b></label>
      <input id={`${id}-alt`} value={alt} maxLength={200} placeholder="What the picture shows, in one sentence"
             onChange={(e) => { setAlt(e.target.value); setState({}); }}
             onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void insert(); } }} />
      <div className="adRte__panelRow">
        <button type="button" className="ad__btn ad__btn--primary" onClick={() => void insert()} disabled={Boolean(state.busy)}>
          {state.busy ?? "Insert picture"}
        </button>
      </div>
      {state.error ? <small className="ad__fe" role="alert">{state.error}</small> : null}
    </div>
  );
}

/** What the toolbar shows as pressed, and the word count. */
const read = (e: Editor) => ({
  p: e.isActive("paragraph"), h2: e.isActive("heading", { level: 2 }), h3: e.isActive("heading", { level: 3 }),
  bold: e.isActive("bold"), italic: e.isActive("italic"), link: e.isActive("link"),
  ul: e.isActive("bulletList"), ol: e.isActive("orderedList"), quote: e.isActive("blockquote"),
  undo: e.can().undo(), redo: e.can().redo(),
  words: e.getText().split(/\s+/).filter(Boolean).length,
});

export default function RichTextEditor({ initial, onChange, labelledBy, describedBy, invalid }: {
  initial: RichDoc;
  onChange: (doc: RichDoc) => void;
  labelledBy: string;
  describedBy?: string;
  invalid?: boolean;
}) {
  const [panel, setPanel] = useState<"link" | "image" | null>(null);
  const change = useRef(onChange);
  useEffect(() => { change.current = onChange; }, [onChange]);

  const editor = useEditor({
    /* Rendered on the client only; the server sends the placeholder. */
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false, codeBlock: false, horizontalRule: false, strike: false, underline: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: "https", protocols: ["https", "http", "mailto"] },
      }),
      PictureWithSize.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder: "Start writing. Use Heading for each section." }),
    ],
    content: initial.content.length ? initial : undefined,
    editorProps: {
      attributes: {
        class: "adRte__doc",
        role: "textbox",
        "aria-multiline": "true",
        "aria-labelledby": labelledBy,
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
        ...(invalid ? { "aria-invalid": "true" } : {}),
      },
    },
    onUpdate: ({ editor: e }) => change.current(e.getJSON() as RichDoc),
  });

  /* The state hook's first reading is taken before the editor exists and is
     not refreshed until the first edit, so the editor is read directly until
     then. */
  const watched = useEditorState({
    editor,
    selector: ({ editor: e }) => (e ? read(e) : null),
  });

  if (!editor) return <div className="adRte adRte--loading" aria-hidden="true" />;
  const s = watched ?? read(editor);
  const c = () => editor.chain().focus();

  return (
    <div className={`adRte${invalid ? " is-bad" : ""}`}>
      <div className="adRte__bar" role="toolbar" aria-label="Formatting">
        <span className="adRte__group">
          <Tool label="Text" on={s.p && !s.ul && !s.ol && !s.quote} onClick={() => c().setParagraph().run()}><Pilcrow aria-hidden="true" /></Tool>
          <Tool label="Heading" on={s.h2} onClick={() => c().toggleHeading({ level: 2 }).run()}><Heading2 aria-hidden="true" /></Tool>
          <Tool label="Subheading" on={s.h3} onClick={() => c().toggleHeading({ level: 3 }).run()}><Heading3 aria-hidden="true" /></Tool>
        </span>
        <span className="adRte__group">
          <Tool label="Bold" on={s.bold} onClick={() => c().toggleBold().run()}><Bold aria-hidden="true" /></Tool>
          <Tool label="Italic" on={s.italic} onClick={() => c().toggleItalic().run()}><Italic aria-hidden="true" /></Tool>
          <Tool label="Link" on={s.link || panel === "link"} onClick={() => setPanel(panel === "link" ? null : "link")}><Link2 aria-hidden="true" /></Tool>
        </span>
        <span className="adRte__group">
          <Tool label="Bulleted list" on={s.ul} onClick={() => c().toggleBulletList().run()}><List aria-hidden="true" /></Tool>
          <Tool label="Numbered list" on={s.ol} onClick={() => c().toggleOrderedList().run()}><ListOrdered aria-hidden="true" /></Tool>
          <Tool label="Quote" on={s.quote} onClick={() => c().toggleBlockquote().run()}><Quote aria-hidden="true" /></Tool>
          <Tool label="Picture" on={panel === "image"} onClick={() => setPanel(panel === "image" ? null : "image")}><ImagePlus aria-hidden="true" /></Tool>
        </span>
        <span className="adRte__group adRte__group--end">
          <Tool label="Undo" disabled={!s.undo} onClick={() => c().undo().run()}><Undo2 aria-hidden="true" /></Tool>
          <Tool label="Redo" disabled={!s.redo} onClick={() => c().redo().run()}><Redo2 aria-hidden="true" /></Tool>
        </span>
      </div>
      {panel === "link" ? <LinkPanel editor={editor} close={() => setPanel(null)} /> : null}
      {panel === "image" ? <ImagePanel editor={editor} close={() => setPanel(null)} /> : null}
      <EditorContent editor={editor} />
      <p className="adRte__foot" aria-live="polite">
        {s.words} {s.words === 1 ? "word" : "words"} · about {Math.max(1, Math.ceil(s.words / 200))} min read
      </p>
    </div>
  );
}
