"use client";

import { useState, type CSSProperties } from "react";
import { Search, Shuffle, type LucideIcon } from "lucide-react";
import { ICON_COLORS, PROJECT_ICONS, PROJECT_ICON_NAMES, iconTileStyle, isIconColor, randomProjectIcon } from "@/lib/project-icons";

/**
 * A project's icon: a grid of real radio buttons (arrow keys move between
 * them), with a shuffle for "just pick one". Starts on the project's own icon,
 * or none for a new project, which then gets a random one when saved.
 */
export function IconPicker({ name = "icon", colorName = "iconColor", defaultValue, defaultColor }: {
  name?: string; colorName?: string; defaultValue?: string; defaultColor?: string;
}) {
  /* No random pick here: this renders on the server too, and a different
     random icon in the browser is a hydration mismatch. A new project with
     none chosen gets a random one when it is saved (createProject). */
  const [value, setValue] = useState(defaultValue ?? "");
  const [q, setQ] = useState("");
  /* Empty is the default look. A pressed dot pressed again goes back to it. */
  const [color, setColor] = useState(isIconColor(defaultColor) ? defaultColor : "");
  /* Every word typed must hit the name, the key or an everyday word for it. */
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const hay = (k: string) => `${k} ${PROJECT_ICONS[k].label} ${PROJECT_ICONS[k].kw ?? ""}`.toLowerCase();
  const matches = PROJECT_ICON_NAMES.filter((k) => words.every((w) => hay(k).includes(w)));
  const shown = matches.slice(0, 150);
  const Chosen: LucideIcon | undefined = value ? PROJECT_ICONS[value]?.icon : undefined;
  return (
    <fieldset className="ad__f adIcons">
      <legend className="ad__fl">Icon</legend>
      <div className="adIcons__top">
        <span className={`adIcons__now${Chosen ? "" : " is-empty"}`} style={Chosen ? iconTileStyle(color) : undefined} aria-hidden="true">{Chosen ? <Chosen /> : <span>?</span>}</span>
        <span className="ad__dim adIcons__hint">{Chosen ? "The client sees it beside the project." : "A random one unless you pick. The client sees it too."}</span>
        <button type="button" className="ad__btn" onClick={() => {
          let next = randomProjectIcon();
          while (next === value && PROJECT_ICON_NAMES.length > 1) next = randomProjectIcon();
          setValue(next);
        }}><Shuffle aria-hidden="true" /> Shuffle</button>
      </div>
      {/* The value travels in this field, not in the radios, so an icon that a search hides is still saved. */}
      <input type="hidden" name={name} value={value} />
      <label className="adIcons__search">
        <Search aria-hidden="true" />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search icons, like money, phone or chart" aria-label="Search icons" autoComplete="off" />
      </label>
      {/* "none" tells the server to clear a colour that was set before; an untouched new project posts nothing. */}
      <input type="hidden" name={colorName} value={color || (defaultColor ? "none" : "")} />
      <div className="adIcons__dots" role="group" aria-label="Icon colour">
        {ICON_COLORS.map((c) => (
          <button
            key={c.key} type="button" className="adIcons__dot" style={{ "--dot": c.fill } as CSSProperties}
            aria-label={c.label} title={c.label} aria-pressed={color === c.key}
            onClick={() => setColor(color === c.key ? "" : c.key)}
          />
        ))}
      </div>
      <p className="ad__dim adIcons__count" aria-live="polite">{words.length ? `${matches.length} ${matches.length === 1 ? "match" : "matches"}${matches.length > 150 ? ", showing the first 150" : ""}` : `${PROJECT_ICON_NAMES.length} icons`}</p>
      <div className="adIcons__grid" role="radiogroup" aria-label="Project icon" data-lenis-prevent>
        {shown.length === 0 ? <p className="ad__dim adIcons__none">No icon matches “{q}”. Try another word.</p> : null}
        {shown.map((k) => {
          const { icon: Icon, label } = PROJECT_ICONS[k];
          return (
            <label key={k} className="adIcons__opt" title={label}>
              <input type="radio" name={`${name}-pick`} value={k} checked={value === k} onChange={() => setValue(k)} />
              <span><Icon aria-hidden="true" /><span className="ad__sr">{label}</span></span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
