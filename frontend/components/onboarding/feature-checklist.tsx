"use client";

import { useId, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";

/**
 * A long, grouped list of options that the client searches or scrolls, used by
 * a `multi` field with `groups` (the Apps features).
 *
 * Order, top to bottom: the search box, the count of picks, the picks as
 * removable chips, the popular options as a row of chips, then "See all
 * features", which unfolds every group. A search hides the popular row and the
 * See all button and lists the matches grouped as before.
 *
 * The stored value is the same string array as any multi-select, so the parent
 * owns the pick rule and passes `picked` (already limited to this list) in.
 * The count and the chips area keep their height when empty, so the first pick
 * does not push the list down.
 *
 * Nothing here is focused on mount: the search box is never auto focused, so a
 * phone does not open its keyboard uninvited.
 */

export default function FeatureChecklist({
  label, groups, popular, picked, onPick,
}: {
  /** The question, read out as the name of the group. */
  label: string;
  groups: { name: string; options: string[] }[];
  popular: string[];
  /** The options picked so far, in the order they were picked. */
  picked: string[];
  onPick: (option: string) => void;
}) {
  const uid = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const all = new Set(groups.flatMap((g) => g.options));
  const q = query.trim().toLowerCase();
  const searching = q !== "";
  const isOn = (o: string) => picked.includes(o);
  const popularShown = popular.filter((o) => all.has(o));
  const matches = groups
    .map((g) => ({ name: g.name, options: g.options.filter((o) => !searching || o.toLowerCase().includes(q)) }))
    .filter((g) => g.options.length > 0);
  const unfolded = open || searching;
  const n = picked.length;
  const count = n === 0 ? "Nothing picked yet" : n === 1 ? "1 feature picked" : `${n} features picked`;

  return (
    <div className="obFeat" role="group" aria-label={label}>
      <div className="obFeat__search">
        <input
          id={`${uid}-q`}
          type="search"
          className="obFeat__input"
          value={query}
          placeholder="Search features"
          aria-label="Search features"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          onChange={(e) => setQuery(e.target.value)}
        />
        {/* Always in the layout, hidden until there is something to clear, so
            typing does not change the width of the row it sits in. */}
        <button
          type="button"
          className="obFeat__clearBox"
          aria-label="Clear search box"
          tabIndex={searching ? 0 : -1}
          aria-hidden={!searching}
          style={{ visibility: searching ? "visible" : "hidden" }}
          onClick={() => setQuery("")}
        >
          Clear
        </button>
      </div>

      <div className="obFeat__summary">
        <p className="obFeat__count" role="status">{count}</p>
        <div className="obFeat__chips">
          {picked.map((o) => (
            <button key={o} type="button" className="obFeat__chip" aria-label={`Remove ${o}`} onClick={() => onPick(o)}>
              {o}
              <X aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>

      {!searching ? (
        <div className="obFeat__pop">
          <p className="obFeat__h" role="heading" aria-level={3}>Popular</p>
          <div className="obFeat__pills">
            {popularShown.map((o) => (
              <button
                key={o}
                type="button"
                role="checkbox"
                aria-checked={isOn(o)}
                className={`obFeat__pill${isOn(o) ? " is-on" : ""}`}
                onClick={() => onPick(o)}
              >
                {isOn(o) ? <Check aria-hidden="true" /> : null}
                {o}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="obFeat__all"
            aria-expanded={open}
            aria-controls={`${uid}-all`}
            onClick={() => setOpen((v) => !v)}
          >
            See all features
            <ChevronDown aria-hidden="true" className={open ? "is-open" : undefined} />
          </button>
        </div>
      ) : null}

      {searching && matches.length === 0 ? (
        <div className="obFeat__none" role="status">
          <p>No features match &ldquo;{query.trim()}&rdquo;.</p>
          <button type="button" className="obFeat__all" onClick={() => setQuery("")}>Clear search</button>
        </div>
      ) : null}

      {unfolded && matches.length > 0 ? (
        <div id={`${uid}-all`} className="obFeat__groups">
          {matches.map((g, gi) => (
            <div key={g.name} className="obFeat__group" role="group" aria-labelledby={`${uid}-g${gi}`}>
              <p className="obFeat__h" id={`${uid}-g${gi}`} role="heading" aria-level={3}>{g.name}</p>
              {g.options.map((o) => (
                <label key={o} className={`obFeat__row${isOn(o) ? " is-on" : ""}`}>
                  <input type="checkbox" checked={isOn(o)} onChange={() => onPick(o)} />
                  <span>{o}</span>
                </label>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
