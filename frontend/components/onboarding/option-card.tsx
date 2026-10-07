"use client";

import { useId } from "react";
import Image from "next/image";
import { Check } from "lucide-react";
import type { OptionInfo } from "@/lib/onboarding-shared";

/**
 * A choice shown as a card: a name in bold, one line of description, one
 * thumbnail and, for a palette, a strip of swatches. Used by a `cards` or
 * `multi` field that carries `optionInfo`. A field without it keeps the plain
 * buttons in onboarding-form.tsx.
 *
 * The parent decides what a pick means (one choice, or add and remove from a
 * list), so the exclusive "None of these" rule stays in one place.
 *
 * The thumbnail is the first of `images` only, lazy, with its width and height
 * set so the card does not move while it loads. Its alt text names the option.
 * The card's accessible name is the option name and its description, not the
 * picture and swatch text, because a role=radio or role=checkbox button hides
 * its children from the accessibility tree.
 */

export default function OptionCards({
  label, options, info, mode, isOn, onPick,
}: {
  /** The question, read out as the name of the group. */
  label: string;
  options: string[];
  info: Record<string, OptionInfo>;
  /** `radio`: one choice. `checkbox`: several. */
  mode: "radio" | "checkbox";
  isOn: (option: string) => boolean;
  onPick: (option: string) => void;
}) {
  return (
    <div className="obOpt" role={mode === "radio" ? "radiogroup" : "group"} aria-label={label}>
      {options.map((o) => (
        <OptionCard key={o} option={o} detail={info[o]} mode={mode} on={isOn(o)} onPick={() => onPick(o)} />
      ))}
    </div>
  );
}

function OptionCard({
  option, detail, mode, on, onPick,
}: {
  option: string;
  detail?: OptionInfo;
  mode: "radio" | "checkbox";
  on: boolean;
  onPick: () => void;
}) {
  const uid = useId();
  const nameId = `${uid}-name`;
  const descId = `${uid}-desc`;
  const swatchId = `${uid}-sw`;
  const image = detail?.images?.[0];
  const describedBy = [detail?.desc ? descId : "", detail?.swatches?.length ? swatchId : ""]
    .filter(Boolean).join(" ") || undefined;
  return (
    <button
      type="button"
      role={mode}
      aria-checked={on}
      aria-labelledby={nameId}
      aria-describedby={describedBy}
      className={`obOpt__card${on ? " is-on" : ""}`}
      onClick={onPick}
    >
      {image ? (
        <Image
          className="obOpt__img"
          src={image}
          alt={`Example: ${option}`}
          width={192}
          height={192}
          sizes="96px"
          loading="lazy"
        />
      ) : null}
      <span className="obOpt__text">
        <strong className="obOpt__name" id={nameId}>{option}</strong>
        {detail?.desc ? <span className="obOpt__desc" id={descId}>{detail.desc}</span> : null}
        {detail?.swatches?.length ? (
          <span className="obOpt__sw" id={swatchId}>
            {detail.swatches.map((hex) => (
              <span key={hex} className="obOpt__swi">
                <span className="obOpt__chip" style={{ background: hex }} aria-hidden="true" />
                {hex}
              </span>
            ))}
          </span>
        ) : null}
      </span>
      <span className="obOpt__tick" aria-hidden="true">{on ? <Check /> : null}</span>
    </button>
  );
}
