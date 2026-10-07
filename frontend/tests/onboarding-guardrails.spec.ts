import { writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { SERVICES } from "../lib/services";
import { isQuestion, isVisible, stepsFor, type Field, type Step } from "../lib/onboarding";
import { SIZE_KEY as BRANDING } from "../lib/onboarding-services/branding";
import { SIZE_KEY as WEB } from "../lib/onboarding-services/web";
import { SIZE_KEY as SEO } from "../lib/onboarding-services/seo";
import { SIZE_KEY as APPS } from "../lib/onboarding-services/apps";
import { SIZE_KEY as SOFTWARE } from "../lib/onboarding-services/software";
import { SIZE_KEY as SOCIAL } from "../lib/onboarding-services/social";

/**
 * THE FORMS AGAINST THE UX RESEARCH (plans/onboarding-ux-research.md, B and F).
 *
 * Measures what a client of each size would actually be shown, with no extra
 * pick (the least a client can do), and holds the numbers to ceilings so a
 * later change cannot quietly turn a small job back into a long form.
 *
 * The research targets (small 10, medium 18, large 26 visible questions) assume
 * the contact details are pre-filled from the payment record, which is not
 * verified, so those cannot be met yet. The ceilings below are what the forms
 * measure today plus a little room, and they are the numbers to bring down.
 *
 * Set EXPORT_ONBOARDING_SPEC to a file path and this also writes every
 * service's questions, conditions and measurements there as JSON.
 */
const SIZES: Record<string, { key: string; options: [string, string, string] }> = {
  branding: { key: BRANDING, options: ["One piece or a small set", "Several pieces", "A full brand"] },
  web: { key: WEB, options: ["A simple site", "A bigger site", "A large site"] },
  seo: { key: SEO, options: ["One site, one place", "A growing site", "A big site or many places"] },
  apps: { key: APPS, options: ["Small", "Medium", "Large"] },
  software: { key: SOFTWARE, options: ["Small", "Medium", "Large"] },
  social: { key: SOCIAL, options: ["Small", "Medium", "Large"] },
};

/* Today's measured numbers plus room. The target column is the research's. */
const CEILING = {
  visible: [21, 25, 32], // research target 10, 18, 26
  required: [11, 11, 11], // research target 10 at every size
  textareas: [3, 3, 7], // research target 2, 4, 6
};

const TAP = new Set(["cards", "multi", "yesno", "select"]);
/* The questions that take real effort on a phone: the research allows one a screen. */
const HARD = new Set(["textarea", "upload", "colours", "domains"]);

function shown(steps: Step[], answers: Record<string, string | string[]>) {
  return steps
    .map((s) => ({ step: s, fields: s.fields.filter((f) => isQuestion(f) && isVisible(f, answers)) }))
    .filter((s) => s.fields.length > 0);
}

function measure(slug: string, option: string) {
  const answers = { [SIZES[slug].key]: option };
  const screens = shown(stepsFor(slug as never), answers);
  const visible = screens.flatMap((s) => s.fields);
  return {
    screens: screens.length,
    visible: visible.length,
    required: visible.filter((f) => f.required).length,
    textareas: visible.filter((f) => f.kind === "textarea").length,
    hardPerScreen: Math.max(...screens.map((s) => s.fields.filter((f) => HARD.has(f.kind)).length)),
    tapsPerScreen: Math.max(...screens.map((s) => s.fields.filter((f) => TAP.has(f.kind)).length)),
  };
}

for (const service of SERVICES) {
  const size = SIZES[service.slug];
  const steps = stepsFor(service.slug);
  const all: Field[] = steps.flatMap((s) => s.fields);

  test(`${service.slug}: keys are unique and every condition points at a real question`, () => {
    const keys = all.map((f) => f.key);
    expect(keys.filter((k, i) => keys.indexOf(k) !== i), "duplicate keys").toEqual([]);
    const known = new Set(keys);
    const refs = (c: unknown): string[] =>
      !c || typeof c !== "object" ? []
      : "any" in (c as object) ? ((c as { any: unknown[] }).any).flatMap(refs)
      : "key" in (c as object) ? [(c as { key: string }).key] : [];
    for (const f of all) {
      for (const c of (Array.isArray(f.showIf) ? f.showIf : f.showIf ? [f.showIf] : [])) {
        for (const key of refs(c)) expect(known.has(key), `${f.key} depends on missing ${key}`).toBe(true);
      }
    }
  });

  test(`${service.slug}: the size question is first, required, and every option has a tier`, () => {
    const first = steps.find((s) => s.service === service.slug)!.fields.find((f) => f.kind !== "notice")!;
    expect(first.key).toBe(size.key);
    expect(first.required).toBe(true);
    expect(first.options).toEqual(size.options);
  });

  test(`${service.slug}: copy has no dashes, semicolons or city names`, () => {
    const text = all.flatMap((f) => [f.label, f.hint, f.tip, f.scope, f.placeholder, ...(f.options ?? []), ...Object.values(f.optionInfo ?? {}).map((o) => o.desc)]);
    for (const t of text) {
      if (!t) continue;
      expect(t, `"${t}"`).not.toMatch(/[–—;]|\s-\s/);
      expect(t, `"${t}"`).not.toMatch(/\b(Lagos|Lekki|Abuja|Nairobi|Dubai|Accra)\b/);
    }
  });

  size.options.forEach((option, i) => {
    test(`${service.slug}: ${option} stays inside its ceiling`, () => {
      const m = measure(service.slug, option);
      const { visible, required, textareas } = m;
      expect(visible, "visible questions").toBeLessThanOrEqual(CEILING.visible[i]);
      expect(required, "required questions").toBeLessThanOrEqual(CEILING.required[i]);
      expect(textareas, "free text boxes").toBeLessThanOrEqual(CEILING.textareas[i]);
    });
  });
}

test.afterAll(() => {
  const out = process.env.EXPORT_ONBOARDING_SPEC;
  if (!out) return;
  const spec = SERVICES.map((s) => ({
    slug: s.slug, name: s.name, size: SIZES[s.slug],
    steps: stepsFor(s.slug).map((st) => ({
      id: st.id, title: st.title, blurb: st.blurb,
      fields: st.fields.map((f) => ({
        key: f.key, kind: f.kind, label: f.label, required: Boolean(f.required), assist: Boolean(f.assist),
        hint: f.hint, options: f.options, showIf: f.showIf, scope: f.scope,
      })),
    })),
    measured: Object.fromEntries(SIZES[s.slug].options.map((o) => [o, measure(s.slug, o)])),
  }));
  writeFileSync(out, JSON.stringify(spec, null, 1));
});
