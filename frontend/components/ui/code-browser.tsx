"use client";

import { useMemo, useState } from "react";
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

function Code({ code }: { code: string }) {
  const lines = useMemo(() => code.split("\n").map(tokenise), [code]);
  return (
    <pre className="cb__pre"><code>
      {lines.map((toks, n) => (
        <span className="cb__line" key={n}>
          <span className="cb__ln" aria-hidden="true">{n + 1}</span>
          <span className="cb__code">
            {toks.map((t, k) =>
              t.c ? <span className={`cb__t cb__t--${t.c}`} key={k}>{t.t}</span> : <span key={k}>{t.t}</span>,
            )}
          </span>
        </span>
      ))}
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
}: {
  files: CodeFile[];
  label?: string;
}) {
  const [openId, setOpenId] = useState(files[0]?.id);
  const [copied, setCopied] = useState(false);
  const open = files.find((f) => f.id === openId) ?? files[0];

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
    <div className="cb">
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
                className={`cb__file${f.id === open.id ? " is-on" : ""}`}
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
        <Code code={open.code} />
      </div>
    </div>
  );
}
