"use client";

import { useState } from "react";
import { Shuffle } from "lucide-react";
import { PROJECT_ICONS, PROJECT_ICON_NAMES, randomProjectIcon } from "@/lib/project-icons";

/**
 * A project's icon: a grid of real radio buttons (arrow keys move between
 * them), with a shuffle for "just pick one". Starts on the project's own icon,
 * or a random one for a new project.
 */
export function IconPicker({ name = "icon", defaultValue }: { name?: string; defaultValue?: string }) {
  const [value, setValue] = useState(() => defaultValue || randomProjectIcon());
  const Chosen = PROJECT_ICONS[value]?.icon;
  return (
    <fieldset className="ad__f adIcons">
      <legend className="ad__fl">Icon</legend>
      <div className="adIcons__top">
        <span className="adIcons__now" aria-hidden="true">{Chosen ? <Chosen /> : null}</span>
        <span className="ad__dim adIcons__hint">The client sees it beside the project.</span>
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
