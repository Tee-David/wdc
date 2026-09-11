"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import "./code-browser.css";

/**
 * A small, real code browser: pick a file, read it, copy it.
 *
 * Built rather than installed. The reference implementation is a shadcn tree
 * plus a server-highlighted `<pre>`, and this site has neither shadcn nor a
 * highlighter in the bundle — pulling both in to render four illustrative files
 * would cost more than the panel it draws.
 *
 * Two things it does differently from a decorative code block:
 *
 *  - It TOKENISES INTO ELEMENTS, never into an HTML string. Highlighters that
 *    build markup by regex-replacing an escaped string are one missed escape
 *    from injecting whatever is in the code sample; returning React nodes means
 *    there is no HTML to get wrong.
 *  - It ADAPTS TO ITS CONTAINER, not the viewport. This sits inside a stage in
 *    one column of a two-column section, so it can be 230px wide on a 1440px
 *    screen. A viewport media query would give it a sidebar it has no room for;
 *    a container query gives it the file rail only when the panel itself is
 *    wide enough, and a scrollable tab strip when it is not.
 */

export type CodeFile = {
  id: string;
  /** Folder path above the file, outermost first. */
  dir: string[];
  name: string;
  code: string;
};

/* Deliberately small. This highlights the shapes a reader recognises at a
   glance — keyword, string, comment, number, type — and leaves everything else
   as plain text, which is honest about being a preview rather than an IDE. */
const RULES: [RegExp, string][] = [
  [/\/\/[^\n]*/y, "com"],
  [/(['"`])(?:\\.|(?!\1)[^\\])*\1/y, "str"],
  [/\b(?:import|from|export|default|const|let|return|function|type|interface|async|await|new|if|else)\b/y, "key"],
  [/\b[A-Z][A-Za-z0-9_]*\b/y, "typ"],
  [/\b\d+(?:\.\d+)?\b/y, "num"],
];

function tokenise(code: string) {
  const out: { t: string; c: string | null }[] = [];
  let i = 0;
  let plain = "";
  const flush = () => { if (plain) { out.push({ t: plain, c: null }); plain = ""; } };
  while (i < code.length) {
    let hit = false;
    for (const [re, cls] of RULES) {
      re.lastIndex = i;
      const m = re.exec(code);
      if (m && m.index === i) {
        flush();
        out.push({ t: m[0], c: cls });
        i += m[0].length;
        hit = true;
        break;
      }
    }
    if (!hit) { plain += code[i]; i += 1; }
  }
  flush();
  return out;
}

function Code({ code, reveal }: { code: string; reveal: number }) {
  const lines = useMemo(() => code.split("\n").map(tokenise), [code]);
  return (
    /* Focusable and labelled: the pane scrolls in both directions, and a scroll
       container only a mouse can reach is unreachable for anyone navigating by
       keyboard. */
    <pre className="cb__pre" tabIndex={0} role="region" aria-label="File contents"><code>
      {lines.map((toks, n) => {
        /* Lines past the reveal point are rendered and HIDDEN rather than
           dropped. Dropping them would shrink the pane on every step and grow
           it back, which moves the whole stage while the demo is running. */
        const on = n < reveal;
        const last = on && n === reveal - 1;
        return (
          <span className={`cb__line${on ? "" : " is-pending"}`} key={n}>
            <span className="cb__ln" aria-hidden="true">{n + 1}</span>
            <span className="cb__code">
              {toks.map((t, k) =>
                t.c ? <span className={`cb__t cb__t--${t.c}`} key={k}>{t.t}</span> : <span key={k}>{t.t}</span>,
              )}
              {last ? <i className="cb__caret" aria-hidden="true" /> : null}
            </span>
          </span>
        );
      })}
    </code></pre>
  );
}

function FileIcon({ name }: { name: string }) {
  const ext = name.split(".").pop() ?? "";
  const tint = ext === "json" ? "json" : ext.startsWith("ts") ? "ts" : "other";
  return <span className={`cb__ext cb__ext--${tint}`} aria-hidden="true">{ext}</span>;
}

export default function CodeBrowser({
  files,
  label = "Source",
  demo = false,
}: {
  files: CodeFile[];
  label?: string;
  /** Run the pointer-and-type loop, the same idea as the content calendar:
      move to a file, press it, stream the source in, move on. It is a
      DEMONSTRATION of the panel, not a replacement for it -- the first real
      pointer or key from the visitor ends it for good and hands the panel
      over intact. */
  demo?: boolean;
}) {
  const [openId, setOpenId] = useState(files[0]?.id);
  const [copied, setCopied] = useState(false);
  const open = files.find((f) => f.id === openId) ?? files[0];

  /* ---- the demo loop ---- */
  const root = useRef<HTMLDivElement | null>(null);
  const btns = useRef<Record<string, HTMLButtonElement | null>>({});
  const timers = useRef<number[]>([]);
  const [taken, setTaken] = useState(false);
  const [near, setNear] = useState(false);
  const [ptr, setPtr] = useState<{ x: number; y: number } | null>(null);
  const [press, setPress] = useState(false);
  const [reveal, setReveal] = useState(Infinity);

  const lineCount = open ? open.code.split("\n").length : 0;

  /* The visitor taking over is permanent. A demo that restarts after a click
     fights whoever is reading, and this panel's whole point is that it can be
     read. */
  const takeOver = useCallback(() => setTaken(true), []);

  useEffect(() => {
    if (!demo) return;
    const el = root.current;
    if (!el || !("IntersectionObserver" in window)) { setNear(true); return; }
    const io = new IntersectionObserver(
      (es) => setNear(es.some((e) => e.isIntersecting)),
      { rootMargin: "120px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [demo]);

  const live = demo && near && !taken;

  useEffect(() => {
    if (!live) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const wait = (ms: number, fn: () => void) => {
      timers.current.push(window.setTimeout(fn, ms));
    };
    const moveTo = (id: string) => {
      const b = btns.current[id];
      const box = root.current;
      if (!b || !box) return;
      const r = b.getBoundingClientRect();
      const o = box.getBoundingClientRect();
      // measured, not computed from an index: the rail becomes a horizontal
      // tab strip in a narrow container, and the same script has to work there
      setPtr({ x: r.left - o.left + Math.min(r.width - 12, 46), y: r.top - o.top + r.height / 2 });
    };

    const cycle = (i: number) => {
      const f = files[i % files.length];
      moveTo(f.id);
      wait(760, () => {
        setPress(true);
        wait(200, () => setPress(false));
        setOpenId(f.id);
        setReveal(0);
        const total = f.code.split("\n").length;
        const step = (n: number) => {
          setReveal(n);
          if (n < total) wait(58, () => step(n + 1));
          else wait(2400, () => cycle(i + 1));
        };
        wait(220, () => step(1));
      });
    };

    const kick = requestAnimationFrame(() => cycle(0));
    const t = timers.current;
    return () => {
      cancelAnimationFrame(kick);
      t.forEach(clearTimeout);
      t.length = 0;
    };
  }, [live, files]);

  /* Whatever stops the loop -- a click, a keypress, scrolling away -- leaves
     the file whole. A half-streamed pane is a broken panel, not a paused one. */
  /* Grouped by folder for the rail. Built from the files themselves so adding
     one to the array is the only edit needed to make it appear. */
  const groups = useMemo(() => {
    const map = new Map<string, CodeFile[]>();
    files.forEach((f) => {
      const k = f.dir.join("/");
      map.set(k, [...(map.get(k) ?? []), f]);
    });
    return [...map.entries()];
  }, [files]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(open.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* Clipboard is permission-gated and blocked outright in some embeds.
         Failing silently is right here: the code is on screen and selectable,
         so nothing is lost, and an error toast for a convenience button is
         noise. */
    }
  };

  if (!open) return null;

  return (
    <div
      className={`cb${live ? " is-demo" : ""}`}
      ref={root}
      onPointerDown={takeOver}
      onKeyDown={takeOver}
    >
      <div className="cb__rail" role="tablist" aria-label={`${label} files`}>
        {groups.map(([dir, list]) => (
          <div className="cb__group" key={dir || "/"}>
            {/* Root files get "/" rather than no heading at all: with the
                label omitted they rendered flush under the PREVIOUS folder's
                heading and read as belonging to it. */}
            <span className="cb__dir" aria-hidden="true">{dir || "/"}</span>
            {list.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={f.id === open.id}
                className={`cb__file${f.id === open.id ? " is-on" : ""}${
                  live && press && f.id === open.id ? " is-press" : ""}`}
                ref={(n) => { btns.current[f.id] = n; }}
                onClick={() => setOpenId(f.id)}
              >
                <FileIcon name={f.name} />
                <span className="cb__name">{f.name}</span>
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="cb__pane">
        <div className="cb__bar">
          <span className="cb__path">
            {open.dir.length ? `${open.dir.join("/")}/` : ""}<b>{open.name}</b>
          </span>
          <button type="button" className="cb__copy" onClick={copy}>
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <Code code={open.code} reveal={live ? reveal : lineCount} />
      </div>

      {/* The pointer. Positioned in pixels measured from the real button, so
          it lands on the file whichever layout the rail is in. */}
      {live && ptr ? (
        <span
          className={`cb__cursor${press ? " is-press" : ""}`}
          aria-hidden="true"
          style={{ "--cx": `${ptr.x}px`, "--cy": `${ptr.y}px` } as CSSProperties}
        >
          <svg viewBox="0 0 16 18"><path d="M1 1l12 9-5.2.8L11 17l-2.6 1-3-6L1 15z" /></svg>
        </span>
      ) : null}
    </div>
  );
}
