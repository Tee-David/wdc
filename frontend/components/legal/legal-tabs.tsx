"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Download, Link2, Search, X } from "lucide-react";
import Rich, { SeeAlso } from "./rich";

type Section = { heading: string; body: string[]; tab: string };

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * A POLICY WITH A TAB PER SERVICE, A SEARCH, AND LINKS THAT TRAVEL. Choosing a
 * tab shows only that service. Typing in the search looks across every tab.
 * Everything can be shared: the address carries the tab (`#web`) or one
 * section of it (`#web:online-shops`), so a link lands exactly there, a tab can
 * be copied or downloaded as a PDF on its own, and so can the whole policy.
 */
export default function LegalTabs({ slug, intro, tabs, sections, email, also }: {
  also: { slug: string; title: string }[]; slug: string; intro: string; tabs: { id: string; label: string }[]; sections: Section[]; email: string;
}) {
  const id = useId();
  const [tab, setTab] = useState(tabs[0].id);
  const [query, setQuery] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    const read = () => {
      const [t, section] = window.location.hash.slice(1).split(":");
      if (!tabs.some((x) => x.id === t)) return;
      setTab(t);
      setQuery("");
      if (section) requestAnimationFrame(() => document.getElementById(`${t}-${section}`)?.scrollIntoView({ block: "start" }));
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [tabs]);

  const choose = (next: string) => { setTab(next); window.history.replaceState(null, "", `#${next}`); };
  const q = query.trim().toLowerCase();
  const shown = useMemo(
    () => (q ? sections.filter((s) => `${s.heading} ${s.body.join(" ")}`.toLowerCase().includes(q)) : sections.filter((s) => s.tab === tab)),
    [q, tab, sections],
  );
  const label = (tabId: string) => tabs.find((t) => t.id === tabId)?.label ?? "";

  async function copy(hash: string, what: string) {
    const url = `${window.location.origin}${window.location.pathname}#${hash}`;
    try { await navigator.clipboard.writeText(url); setNote(`Link to ${what} copied.`); }
    catch { window.history.replaceState(null, "", `#${hash}`); setNote(`The address bar now has the link to ${what}. Copy it from there.`); }
    window.setTimeout(() => setNote(""), 4000);
  }

  return (
    <article className="lg-body lg-body--tabs">
      <p className="lg-intro"><Rich text={intro} here={slug} /></p>

      <div className="lg-find">
        <label htmlFor={`${id}-q`} className="lg-find__l">Search this policy</label>
        <div className="lg-find__box">
          <Search aria-hidden="true" />
          <input id={`${id}-q`} type="search" value={query} placeholder="For example refund, revision, hosting, banned" autoComplete="off"
            onChange={(event) => setQuery(event.target.value)} />
          {query ? <button type="button" aria-label="Clear the search" onClick={() => setQuery("")}><X aria-hidden="true" /></button> : null}
        </div>
      </div>

      {!q ? (
        <>
          <div className="lg-tabs" role="tablist" aria-label="Choose a service">
            {tabs.map((t) => (
              <button key={t.id} type="button" role="tab" id={`${id}-t-${t.id}`} aria-selected={tab === t.id} aria-controls={`${id}-panel`}
                className={`lg-tab${tab === t.id ? " is-on" : ""}`} onClick={() => choose(t.id)}>{t.label}</button>
            ))}
          </div>
          <div className="lg-share" aria-label={`Share or download ${label(tab)}`}>
            <button type="button" onClick={() => void copy(tab, `${label(tab)}`)}><Link2 aria-hidden="true" /> Copy link to this tab</button>
            <a href={`/legal/${slug}/pdf?tab=${tab}`} download><Download aria-hidden="true" /> This tab as a PDF</a>
            <a href={`/legal/${slug}/pdf`} download><Download aria-hidden="true" /> The whole policy as a PDF</a>
          </div>
        </>
      ) : (
        <p className="lg-count" role="status">{shown.length ? `${shown.length} ${shown.length === 1 ? "match" : "matches"} across all tabs` : "Nothing matches that. Try a shorter word, or write to us."}</p>
      )}
      <p className="lg-note" role="status">{note}</p>

      <div id={`${id}-panel`} role={q ? undefined : "tabpanel"} aria-labelledby={q ? undefined : `${id}-t-${tab}`}>
        {shown.map((s, n) => {
          const anchor = `${s.tab}-${slugify(s.heading)}`;
          return (
            <section key={`${anchor}-${n}`} id={anchor} className="lg-sec lg-sec--anchor">
              {q ? <p className="lg-where">{label(s.tab)}</p> : null}
              <h2>
                {s.heading}
                <button type="button" className="lg-anchor" aria-label={`Copy link to ${s.heading}`} onClick={() => void copy(`${s.tab}:${slugify(s.heading)}`, s.heading)}><Link2 aria-hidden="true" /></button>
              </h2>
              {s.body.map((para, k) => <p key={k}><Rich text={para} here={slug} /></p>)}
            </section>
          );
        })}
        {!shown.length && q ? <p>Write to <a href={`mailto:${email}`}>{email}</a> and we will answer, and add it here.</p> : null}
      </div>
      <p className="lg-pdf"><a href={`/legal/${slug}/pdf`} download>Download this policy as a PDF</a></p>
      <SeeAlso here={slug} docs={also} />
    </article>
  );
}
