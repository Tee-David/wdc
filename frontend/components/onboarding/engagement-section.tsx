"use client";

import { Check } from "lucide-react";
import { ENGAGEMENT_VERSION, engagementFor, engagementNameProblem } from "@/lib/onboarding-engagement";
import type { ServiceSlug } from "@/lib/services";

/**
 * The client engagement section, four grouped ticks and a typed name
 * (plans/onboarding-ux-research.md E7). DRAFT TEXT: the form only mounts this
 * when `engagementIsLive()` is true, which needs a lawyer's approval first.
 *
 * What is recorded, as plain answers in the existing answers JSON: which
 * groups were ticked, the typed name, and once everything is done the text's
 * version and the time. Unticking anything clears the acceptance, so a record
 * of acceptance can only ever describe a complete one.
 */
type Answers = Record<string, string | string[]>;

export function engagementAccepted(a: Answers): boolean {
  const ticks = Array.isArray(a.engagement_ticks) ? a.engagement_ticks : [];
  return ticks.length === 4 && engagementNameProblem(a.engagement_name) === null && a.engagement_version === ENGAGEMENT_VERSION;
}

export default function EngagementSection({
  service, answers, set,
}: {
  service: ServiceSlug;
  answers: Answers;
  set: (key: string, value: string | string[]) => void;
}) {
  const groups = engagementFor(service);
  const ticks = Array.isArray(answers.engagement_ticks) ? answers.engagement_ticks : [];
  const name = typeof answers.engagement_name === "string" ? answers.engagement_name : "";

  /* The acceptance is derived, and rewritten whenever a tick or the name changes. */
  const update = (nextTicks: string[], nextName: string) => {
    set("engagement_ticks", nextTicks);
    set("engagement_name", nextName);
    const complete = nextTicks.length === groups.length && engagementNameProblem(nextName) === null;
    set("engagement_version", complete ? ENGAGEMENT_VERSION : "");
    set("engagement_accepted_at", complete ? new Date().toISOString() : "");
  };

  const toggle = (id: string) =>
    update(ticks.includes(id) ? ticks.filter((x) => x !== id) : [...ticks, id], name);

  return (
    <section className="obEng" aria-labelledby="obEng-h">
      <h2 id="obEng-h">Before you send</h2>
      <p className="ob__lede">Four short things to agree. Open any of them to read it in full.</p>
      {groups.map((g) => {
        const on = ticks.includes(g.id);
        return (
          <div className="obEng__group" key={g.id}>
            <h3>{g.title}</h3>
            <p>{g.summary}</p>
            <details>
              <summary>Read in full</summary>
              {g.body.map((para) => <p key={para.slice(0, 32)}>{para}</p>)}
            </details>
            <button
              type="button" role="checkbox" aria-checked={on}
              className={`ob__card${on ? " is-on" : ""}`}
              onClick={() => toggle(g.id)}
            >
              <span className="ob__tick" aria-hidden="true">{on ? <Check /> : null}</span>
              <span>I have read this and I agree</span>
            </button>
          </div>
        );
      })}
      <div className="ob__f">
        <label className="ob__label" htmlFor="obEng-name">Type your full name to accept <b aria-hidden="true">*</b></label>
        <div className="ob__ctl">
          <input id="obEng-name" type="text" autoComplete="name" value={name} onChange={(e) => update(ticks, e.target.value)} />
        </div>
      </div>
    </section>
  );
}
