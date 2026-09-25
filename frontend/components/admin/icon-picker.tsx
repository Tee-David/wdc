"use client";

import { useState } from "react";
import { Shuffle, type LucideIcon } from "lucide-react";
import { PROJECT_ICONS, PROJECT_ICON_NAMES, randomProjectIcon } from "@/lib/project-icons";

/**
 * A project's icon: a grid of real radio buttons (arrow keys move between
 * them), with a shuffle for "just pick one". Starts on the project's own icon,
 * or none for a new project, which then gets a random one when saved.
 */
export function IconPicker({ name = "icon", defaultValue }: { name?: string; defaultValue?: string }) {
  /* No random pick here: this renders on the server too, and a different
     random icon in the browser is a hydration mismatch. A new project with
     none chosen gets a random one when it is saved (createProject). */
  const [value, setValue] = useState(defaultValue ?? "");
  const Chosen: LucideIcon | undefined = value ? PROJECT_ICONS[value]?.icon : undefined;
  return (
    <fieldset className="ad__f adIcons">
      <legend className="ad__fl">Icon</legend>
      <div className="adIcons__top">
        <span className={`adIcons__now${Chosen ? "" : " is-empty"}`} aria-hidden="true">{Chosen ? <Chosen /> : <span>?</span>}</span>
        <span className="ad__dim adIcons__hint">{Chosen ? "The client sees it beside the project." : "A random one unless you pick. The client sees it too."}</span>
        <button type="button" className="ad__btn" onClick={() => {
          let next = randomProjectIcon();
          while (next === value && PROJECT_ICON_NAMES.length > 1) next = randomProjectIcon();
          setValue(next);
        }}><Shuffle aria-hidden="true" /> Shuffle</button>
      </div>
      <div className="adIcons__grid" role="radiogroup" aria-label="Project icon">
        {PROJECT_ICON_NAMES.map((k) => {
          const { icon: Icon, label } = PROJECT_ICONS[k];
          return (
            <label key={k} className="adIcons__opt" title={label}>
              <input type="radio" name={name} value={k} checked={value === k} onChange={() => setValue(k)} />
              <span><Icon aria-hidden="true" /><span className="ad__sr">{label}</span></span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
