import "server-only";

import { answerText, type Answers, type FileAnswer } from "@/lib/forms/custom-def";
import { versionDef } from "@/lib/forms/custom";
import { stepsFor } from "@/lib/onboarding";
import type { FormDef } from "@/lib/forms/registry";
import type { Entry } from "@/lib/forms/entries";
import { customFiles, onboardingFiles, type EntryFile } from "@/lib/onboarding-files";

/** What the client uploaded, from whichever kind of form it came in on. */
export async function entryFiles(form: FormDef, entry: Entry): Promise<EntryFile[]> {
  if (form.source === "onboarding" && form.service) {
    const fields = stepsFor(form.service).flatMap((st) => st.fields).filter((f) => f.kind === "upload").map((f) => ({ key: f.key, label: f.label }));
    return onboardingFiles(entry.id, entry.answers, fields);
  }
  if (form.source === "custom") {
    const def = await versionDef(form.key, entry.version ?? 0);
    const answers = entry.answers as unknown as Answers;
    return customFiles((def?.fields ?? []).flatMap((f) => {
      const a = answers[f.id];
      return Array.isArray(a) && a.length && typeof a[0] === "object" ? (a as FileAnswer[]).map((x) => ({ question: f.label, key: x.key, name: x.name, size: x.size })) : [];
    }));
  }
  return [];
}

export type EntrySection = { heading: string; rows: { q: string; a: string | null }[] };

/**
 * THE ENTRY AS A DOCUMENT: the facts, then every question in the order the
 * client saw it, a gap shown as a gap. The PDF reads this; the entry page
 * draws its own, richer version of the same walk.
 */
export async function entrySections(form: FormDef, entry: Entry): Promise<EntrySection[]> {
  const has = (v: unknown) => (Array.isArray(v) ? v.length > 0 : Boolean(v && String(v).trim()));
  if (form.source === "contact") {
    return [{ heading: entry.topic || "Enquiry", rows: [{ q: "Message", a: entry.message || null }] }];
  }
  if (form.source === "onboarding" && form.service) {
    return stepsFor(form.service).map((st) => ({
      heading: st.title,
      rows: st.fields.filter((f) => {
        if (!f.showIf) return true;
        const v = entry.answers[f.showIf.key];
        return Array.isArray(v) ? v.some((x) => f.showIf!.equals.includes(x)) : typeof v === "string" && f.showIf.equals.includes(v);
      }).map((f) => {
        const v = entry.answers[f.key];
        return { q: f.label, a: has(v) ? (Array.isArray(v) ? v.join(", ") : String(v)) : null };
      }),
    })).filter((s) => s.rows.length);
  }
  if (form.source === "custom") {
    const def = await versionDef(form.key, entry.version ?? 0);
    const answers = entry.answers as unknown as Answers;
    if (!def) return [{ heading: "Answers", rows: Object.entries(answers).map(([k, v]) => ({ q: k, a: answerText(v) || null })) }];
    /* A heading in the form starts a section here too. */
    const out: EntrySection[] = [{ heading: "Answers", rows: [] }];
    for (const f of def.fields) {
      if (f.type === "heading") { out.push({ heading: f.label, rows: [] }); continue; }
      out[out.length - 1].rows.push({ q: f.label, a: answerText(answers[f.id]) || null });
    }
    return out.filter((s) => s.rows.length);
  }
  return [];
}
