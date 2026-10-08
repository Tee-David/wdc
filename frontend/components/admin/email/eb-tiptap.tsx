"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import { EditorContent, Extension, mergeAttributes, Node, nodeInputRule, nodePasteRule, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { NodeSelection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { isRichHtml, mdToHtml, splitTags, tagText } from "@/lib/email-design";

/**
 * THE EMAIL BUILDER'S TEXT EDITING (TipTap, loaded only with the builder).
 *
 * Two editors share one schema idea. RichText is a few paragraphs with the
 * email-safe subset (bold, italic, underline, links, bullet and numbered lists,
 * a heading, a quote, alignment). LineText is one line of words, for the
 * subject and the heading. Both hold merge tags as an inline chip, and both
 * store them the way the renderer reads them: `{{key | "fallback"}}`.
 *
 * TipTap's own undo history is OFF. The builder keeps one history for the whole
 * email (typing, moving blocks, the subject), so Ctrl+Z means the same thing
 * everywhere; the editors hand the shortcut to it.
 */

export type Kit = {
  /** An editor took the cursor: the toolbar and the Tags tab act on it from now on. */
  focus: (editor: Editor, rich: boolean) => void;
  /** A merge tag chip was pressed (or Enter on a selected one). */
  chip: (view: EditorView, pos: number, el: HTMLElement) => void;
  undo: () => void;
  redo: () => void;
};
const none: Kit = { focus: () => {}, chip: () => {}, undo: () => {}, redo: () => {} };
export const KitContext = createContext<Kit>(none);

/* ----------------------------------------------------------- extensions */

export const MergeTag = Node.create({
  name: "mergeTag",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return { key: { default: "" }, fallback: { default: "" } };
  },
  parseHTML() {
    return [{
      tag: "span[data-merge-tag]",
      getAttrs: (el) => ({ key: (el as HTMLElement).getAttribute("data-key") ?? "", fallback: (el as HTMLElement).getAttribute("data-fallback") ?? "" }),
    }];
  },
  renderHTML({ node }) {
    const { key, fallback } = node.attrs as { key: string; fallback: string };
    return ["span", mergeAttributes({
      "data-merge-tag": "", "data-key": key, "data-fallback": fallback, class: "eb-mt", role: "button",
      "aria-label": `Merge tag ${key}${fallback ? `, shows "${fallback}" when empty` : ""}. Press Enter to edit.`,
      title: fallback ? `Fallback: ${fallback}` : "No fallback: empty when there is no value",
    }), key];
  },
  renderText({ node }) {
    return tagText(node.attrs.key, node.attrs.fallback);
  },
  /* Typing or pasting {{client.first_name}} becomes a chip. */
  addInputRules() {
    return [nodeInputRule({
      find: /\{\{\s*([a-z0-9_.]+)\s*(?:\|\s*"([^"]*)")?\s*\}\}$/i,
      type: this.type,
      getAttributes: (m) => ({ key: m[1].toLowerCase(), fallback: m[2] ?? "" }),
    })];
  },
  addPasteRules() {
    return [nodePasteRule({
      find: /\{\{\s*([a-z0-9_.]+)\s*(?:\|\s*"([^"]*)")?\s*\}\}/gi,
      type: this.type,
      getAttributes: (m) => ({ key: m[1].toLowerCase(), fallback: m[2] ?? "" }),
    })];
  },
});

/** left, centre or right on a paragraph or heading: the only styling the renderer keeps. */
const Align = Extension.create({
  name: "align",
  addGlobalAttributes() {
    return [{
      types: ["paragraph", "heading"],
      attributes: {
        textAlign: {
          default: null,
          parseHTML: (el: HTMLElement) => (/^(left|center|right)$/.test(el.style.textAlign) ? el.style.textAlign : null),
          renderHTML: (a: { textAlign?: string | null }) => (a.textAlign ? { style: `text-align:${a.textAlign}` } : {}),
        },
      },
    }];
  },
});

function historyKeys(kit: Kit) {
  return Extension.create({
    name: "designHistory",
    addKeyboardShortcuts() {
      return {
        "Mod-z": () => { kit.undo(); return true; },
        "Mod-Shift-z": () => { kit.redo(); return true; },
        "Mod-y": () => { kit.redo(); return true; },
      };
    },
  });
}

/* A one-line document: a single paragraph of words and chips. */
const Doc = Node.create({ name: "doc", topNode: true, content: "paragraph" });
const Para = Node.create({
  name: "paragraph", group: "block", content: "inline*",
  parseHTML() { return [{ tag: "p" }]; },
  renderHTML({ HTMLAttributes }) { return ["p", mergeAttributes(HTMLAttributes), 0]; },
});
const Words = Node.create({ name: "text", group: "inline" });
const NoEnter = Extension.create({
  name: "noEnter",
  addKeyboardShortcuts() { return { Enter: () => true, "Shift-Enter": () => true }; },
});

/* ------------------------------------------------- stored text <-> editor */

const SAFE_HREF = /^(https:\/\/|mailto:|\{\{)/i;

function chipSpan(doc: Document, key: string, fallback: string) {
  const s = doc.createElement("span");
  s.setAttribute("data-merge-tag", "");
  s.setAttribute("data-key", key);
  s.setAttribute("data-fallback", fallback);
  s.textContent = key;
  return s;
}

/** Turns every `{{tag | "x"}}` written in the text into a chip, leaving attributes alone. */
function chipify(doc: Document) {
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const hits: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) if ((n as Text).data.includes("{{")) hits.push(n as Text);
  for (const t of hits) {
    const frag = doc.createDocumentFragment();
    for (const p of splitTags(t.data)) frag.append(typeof p === "string" ? doc.createTextNode(p) : chipSpan(doc, p.key, p.fallback));
    t.replaceWith(frag);
  }
}

/** Stored text -> what the editor loads. Old markdown-ish text is converted, so nothing is lost. */
export function toEditor(value: string, rich: boolean): string {
  const doc = new DOMParser().parseFromString("", "text/html");
  if (rich) doc.body.innerHTML = isRichHtml(value) ? value : mdToHtml(value);
  else { const p = doc.createElement("p"); p.textContent = value; doc.body.append(p); }
  chipify(doc);
  return doc.body.innerHTML;
}

/** The editor's content -> the safe subset with tags written as text. */
export function fromEditor(editor: Editor, rich: boolean): string {
  if (!rich) return editor.getText({ blockSeparator: "" });
  const doc = new DOMParser().parseFromString(editor.getHTML(), "text/html");
  doc.body.querySelectorAll("[data-merge-tag]").forEach((s) => s.replaceWith(doc.createTextNode(tagText(s.getAttribute("data-key") ?? "", s.getAttribute("data-fallback") ?? ""))));
  doc.body.querySelectorAll("*").forEach((el) => {
    const tag = el.tagName.toLowerCase();
    for (const a of [...el.attributes]) {
      const keep = (tag === "a" && a.name === "href") || (a.name === "style" && /^text-align:\s*(left|center|right);?$/.test(a.value));
      if (!keep) el.removeAttribute(a.name);
    }
  });
  return doc.body.innerHTML;
}

/** Put a tag at the cursor. */
export function insertTag(editor: Editor, key: string) {
  editor.chain().focus().insertContent([{ type: "mergeTag", attrs: { key, fallback: "" } }, { type: "text", text: " " }]).run();
}

/* ---------------------------------------------------------------- views */

type Common = { value: string; onChange: (v: string) => void; label: string; placeholder?: string };

/** The props every editor shares: its name for assistive tech, and the chip's click and Enter. */
function editorProps(kit: Kit, label: string, extra: Record<string, string>) {
  return {
    attributes: { class: "eb-ed", role: "textbox", "aria-label": label, spellcheck: "true", ...extra },
    handleClickOn: (view: EditorView, _pos: number, node: { type: { name: string } }, nodePos: number, event: MouseEvent) => {
      if (node.type.name !== "mergeTag") return false;
      const el = (event.target as HTMLElement).closest<HTMLElement>("[data-merge-tag]");
      if (el) kit.chip(view, nodePos, el);
      return true;
    },
    handleKeyDown: (view: EditorView, event: KeyboardEvent) => {
      const sel = view.state.selection;
      if (event.key === "Enter" && sel instanceof NodeSelection && sel.node.type.name === "mergeTag") {
        const el = view.nodeDOM(sel.from) as HTMLElement | null;
        if (el) { kit.chip(view, sel.from, el); return true; }
      }
      return false;
    },
  };
}

/**
 * One editor bound to one stored string. The string is the source of truth:
 * what the editor emits is remembered, and only a DIFFERENT incoming value (an
 * undo, a loaded version) is poured back in.
 */
function useStoredText({ value, onChange, label, placeholder }: Common, rich: boolean) {
  const kit = useContext(KitContext);
  const emitted = useRef(value);
  const change = useRef(onChange);
  useEffect(() => { change.current = onChange; }, [onChange]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: rich
      ? [
        StarterKit.configure({
          heading: { levels: [2] },
          code: false, codeBlock: false, horizontalRule: false, strike: false, undoRedo: false, dropcursor: false, trailingNode: false,
          link: { openOnClick: false, autolink: true, defaultProtocol: "https", protocols: ["mailto"], isAllowedUri: (url) => SAFE_HREF.test(url) },
        }),
        Align, MergeTag, historyKeys(kit), Placeholder.configure({ placeholder: placeholder ?? "Write here" }),
      ]
      : [Doc, Para, Words, MergeTag, NoEnter, historyKeys(kit), Placeholder.configure({ placeholder: placeholder ?? "" })],
    content: toEditor(value, rich),
    editorProps: editorProps(kit, label, rich ? { "aria-multiline": "true" } : {}),
    onUpdate: ({ editor: e }) => { const out = fromEditor(e, rich); emitted.current = out; change.current(out); },
    onFocus: ({ editor: e }) => kit.focus(e, rich),
  });

  useEffect(() => {
    if (!editor || value === emitted.current) return;
    emitted.current = value;
    editor.commands.setContent(toEditor(value, rich), { emitUpdate: false });
  }, [editor, value, rich]);
  return editor;
}

/** A few paragraphs of email text with formatting. */
export function RichText(props: Common) {
  const editor = useStoredText(props, true);
  return <EditorContent editor={editor} className="eb-edh" />;
}

/** One line of words and chips (the subject, the heading). Enter does nothing. */
export function LineText(props: Common) {
  const editor = useStoredText(props, false);
  return <EditorContent editor={editor} className="eb-edh eb-edh--line" />;
}
