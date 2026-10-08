"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Search, X } from "lucide-react";

type Section = { heading: string; body: string[]; tab: string };

/**
 * A POLICY WITH A TAB PER SERVICE, AND A SEARCH. The Client Engagement Policy
 * has general terms and then the particulars of each kind of work, which do
 * not belong in one long scroll: a client doing a flyer should not have to
 * read the terms for an app. Choosing a tab shows only that service. Typing in
 * the search looks across every tab and shows where each result lives. The
 * chosen tab is kept in the address (`#branding`), so a link lands on it.
 */
export default function LegalTabs({ intro, tabs, sections, email }: {
  intro: string; tabs: { id: string; label: string }[]; sections: Section[]; email: string;
}) {
  const id = useId();
  const [tab, setTab] = useState(tabs[0].id);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const read = () => { const h = window.location.hash.slice(1); if (tabs.some((t) => t.id === h)) setTab(h); };
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
  const linked = (text: string) => text.split(email).flatMap((part, i) => (i === 0 ? [part] : [<a key={i} href={`mailto:${email}`}>{email}</a>, part]));

  return (
    <article className="lg-body lg-body--tabs">
      <p className="lg-intro">{intro}</p>

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
        <div className="lg-tabs" role="tablist" aria-label="Choose a service">
          {tabs.map((t) => (
            <button key={t.id} type="button" role="tab" id={`${id}-t-${t.id}`} aria-selected={tab === t.id} aria-controls={`${id}-panel`}
              className={`lg-tab${tab === t.id ? " is-on" : ""}`} onClick={() => choose(t.id)}>{t.label}</button>
          ))}
        </div>
      ) : (
        <p className="lg-count" role="status">{shown.length ? `${shown.length} ${shown.length === 1 ? "match" : "matches"} across all tabs` : "Nothing matches that. Try a shorter word, or write to us."}</p>
      )}

      <div id={`${id}-panel`} role={q ? undefined : "tabpanel"} aria-labelledby={q ? undefined : `${id}-t-${tab}`}>
        {shown.map((s, n) => (
          <section key={`${s.tab}-${s.heading}-${n}`} className="lg-sec">
            {q ? <p className="lg-where">{label(s.tab)}</p> : null}
            <h2>{s.heading}</h2>
            {s.body.map((para, k) => <p key={k}>{linked(para)}</p>)}
          </section>
        ))}
        {!shown.length && q ? <p>Write to <a href={`mailto:${email}`}>{email}</a> and we will answer, and add it here.</p> : null}
      </div>
    </article>
  );
}
