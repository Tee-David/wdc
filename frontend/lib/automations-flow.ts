import { validDesign, type Design } from "@/lib/email-design";

/**
 * THE SHAPE OF AN AUTOMATION, as pure data and pure functions: no database, no
 * server imports, so the canvas in the browser, the engine on the server and
 * the spec all read the same rules.
 *
 * A flow is a list of steps. One step, `if`, branches: a person who has its tag
 * goes down `yes`, everyone else down `no`. Branches do not rejoin, so an `if`
 * is always the LAST step of its list (adding one moves whatever followed it
 * onto its `no` path) and the end of a branch is the end of the run.
 *
 * A PERSON'S PLACE IS A PATH: the ids of the steps from the top down to the one
 * that runs next, `["ask-if", "email-b"]`. It stays one cursor however deep the
 * branches go, it survives steps being added around it (an index would not), and
 * ids are unique across the whole flow, so no "yes" or "no" needs storing in it.
 */

type Base = { id: string; name?: string };
export type WaitStep = Base & { type: "wait"; days: number; hours: number; weekdays: number[]; hour: number | null };
export type EmailStep = Base & { type: "email"; subject: string; design: Design };
export type TagStep = Base & { type: "tag"; tag: string; remove: boolean };
/** The old straight-line way to stop: kept working, no longer offered in the menu (an `if` and a `stop` do it better). */
export type StopIfTagStep = Base & { type: "stop_if_tag"; tag: string };
export type NoteStep = Base & { type: "note"; text: string };
export type WebhookStep = Base & { type: "webhook"; url: string };
export type IfStep = Base & { type: "if"; tag: string; yes: Step[]; no: Step[] };
export type StopStep = Base & { type: "stop" };
export type Step = WaitStep | EmailStep | TagStep | StopIfTagStep | NoteStep | WebhookStep | IfStep | StopStep;
export type StepType = Step["type"];

export const MAX_DEPTH = 3;
export const MAX_STEPS = 40;

export const TYPE_LABEL: Record<StepType, string> = {
  wait: "Wait", email: "Send an email", tag: "Add or remove a tag", stop_if_tag: "Stop if they have a tag",
  note: "Add a note", webhook: "Call a web address", if: "Check a tag", stop: "Stop here",
};
/** What the add menu offers, in order. `stop_if_tag` is deliberately absent. */
export const MENU: StepType[] = ["wait", "email", "tag", "if", "note", "webhook", "stop"];

export const normTag = (t: string) => t.trim().toLowerCase().slice(0, 40);

export const SAFE_HOOK = (url: string) => {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && !/^(localhost|.*\.local|.*\.internal)$/i.test(u.hostname) && !/^[\d.]+$/.test(u.hostname) && !u.hostname.includes(":") && !u.username && !u.password;
  } catch { return false; }
};

/** When a wait ends: after days and hours, then, if weekdays are set, the next allowed day (Lagos) at the chosen hour. */
export function waitEnds(from: Date, w: { days: number; hours: number; weekdays: number[]; hour: number | null }): Date {
  let t = new Date(from.getTime() + (w.days * 24 + w.hours) * 3_600_000);
  if (w.weekdays.length || w.hour !== null) {
    for (let i = 0; i < 8; i++) {
      const lagos = new Date(t.getTime() + 3_600_000); // Lagos is UTC+1, no daylight saving
      const day = lagos.getUTCDay();
      if (!w.weekdays.length || w.weekdays.includes(day)) {
        if (w.hour === null) break;
        const at = new Date(Date.UTC(lagos.getUTCFullYear(), lagos.getUTCMonth(), lagos.getUTCDate(), w.hour - 1, 0, 0));
        if (at.getTime() >= t.getTime() - 1000) { t = at; break; }
      }
      t = new Date(Date.UTC(lagos.getUTCFullYear(), lagos.getUTCMonth(), lagos.getUTCDate() + 1, w.hour === null ? 0 : w.hour - 1, 0, 0));
    }
  }
  return t;
}

/* ------------------------------------------------------------- reading */

export function forEachStep(steps: Step[], fn: (s: Step, depth: number) => void, depth = 1) {
  for (const s of steps) {
    fn(s, depth);
    if (s.type === "if") { forEachStep(s.yes, fn, depth + 1); forEachStep(s.no, fn, depth + 1); }
  }
}
export const countSteps = (steps: Step[]) => { let n = 0; forEachStep(steps, () => n++); return n; };
export const hasBranches = (steps: Step[]) => steps.some((s) => s.type === "if");

export type Found = { step: Step; seq: Step[]; index: number; depth: number; parent: { id: string; branch: "yes" | "no" } | null };
export function findStep(steps: Step[], id: string, depth = 1, parent: Found["parent"] = null): Found | null {
  for (let index = 0; index < steps.length; index++) {
    const step = steps[index];
    if (step.id === id) return { step, seq: steps, index, depth, parent };
    if (step.type === "if") {
      const hit = findStep(step.yes, id, depth + 1, { id: step.id, branch: "yes" }) ?? findStep(step.no, id, depth + 1, { id: step.id, branch: "no" });
      if (hit) return hit;
    }
  }
  return null;
}

/** The last two words a person reads on a node: what the step does, in the least space. */
export function stepSummary(s: Step): string {
  switch (s.type) {
    case "wait": {
      const d = s.days ? `${s.days} day${s.days === 1 ? "" : "s"}` : "";
      const h = s.hours ? `${s.hours} h` : "";
      return [d, h].filter(Boolean).join(" ") || "No wait";
    }
    case "email": return s.subject.trim() || "No subject yet";
    case "tag": return `${s.remove ? "Remove" : "Add"} ${s.tag.trim() ? `“${s.tag.trim()}”` : "…"}`;
    case "stop_if_tag": return `Stops if tagged “${s.tag.trim() || "…"}”`;
    case "if": return `Has the tag “${s.tag.trim() || "…"}”?`;
    case "note": return s.text.trim() || "Empty note";
    case "webhook": return s.url.trim() || "No address yet";
    case "stop": return "Ends here";
  }
}
export const stepTitle = (s: Step) => s.name?.trim() || TYPE_LABEL[s.type];

/** What is missing from a step before it can go live, or null. The one rule behind the warning dot, the Publish button and the server. */
export function stepProblem(s: Step): string | null {
  switch (s.type) {
    case "email": return s.subject.trim() ? null : "Needs a subject.";
    case "tag": case "stop_if_tag": case "if": return normTag(s.tag) ? null : "Choose a tag.";
    case "note": return s.text.trim() ? null : "The note is empty.";
    case "webhook": return SAFE_HOOK(s.url) ? null : "Needs a public https address.";
    default: return null;
  }
}
export function problems(steps: Step[]): { id: string; title: string; why: string }[] {
  const out: { id: string; title: string; why: string }[] = [];
  forEachStep(steps, (s) => { const why = stepProblem(s); if (why) out.push({ id: s.id, title: stepTitle(s), why }); });
  return out;
}

/* ---------------------------------------------------------- validation */

const ID = /^[A-Za-z0-9_-]{1,40}$/;
const int = (n: unknown, lo: number, hi: number) => typeof n === "number" && Number.isInteger(n) && n >= lo && n <= hi;

/**
 * Why a list of steps cannot be saved, or null when it can.
 *
 * "draft" checks the SHAPE only (types, sizes, depth, unique ids), so a half-written flow can be kept
 * while it is off. "publish" also demands every step is complete, and is what
 * a switched-on automation is always held to, because saving it changes what
 * is sent to real people.
 */
export function checkSteps(steps: unknown, mode: "draft" | "publish" = "publish"): string | null {
  if (!Array.isArray(steps)) return "That could not be read.";
  const seen = new Set<string>();
  let total = 0;
  const walk = (seq: unknown[], depth: number): string | null => {
    if (depth > MAX_DEPTH) return `Yes/No steps can go ${MAX_DEPTH - 1} levels deep at most.`;
    for (let i = 0; i < seq.length; i++) {
      const s = seq[i] as Step;
      if (!s || typeof s !== "object" || typeof s.id !== "string" || !ID.test(s.id)) return "A step has no valid id.";
      if (seen.has(s.id)) return "Two steps share an id.";
      seen.add(s.id);
      if (++total > MAX_STEPS) return `An automation can have ${MAX_STEPS} steps at most.`;
      if (s.name !== undefined && (typeof s.name !== "string" || s.name.length > 60)) return "A step name is too long.";
      switch (s.type) {
        case "wait":
          if (!int(s.days, 0, 365) || !int(s.hours, 0, 23) || !Array.isArray(s.weekdays) || !s.weekdays.every((d) => int(d, 0, 6)) || !(s.hour === null || int(s.hour, 0, 23))) return "A wait is out of range.";
          break;
        case "email":
          if (typeof s.subject !== "string" || s.subject.length > 150 || !validDesign(s.design)) return "An email step is not valid.";
          break;
        case "tag":
          if (typeof s.tag !== "string" || s.tag.length > 60 || typeof s.remove !== "boolean") return "A tag step is not valid.";
          break;
        case "stop_if_tag":
          if (typeof s.tag !== "string" || s.tag.length > 60) return "A tag is not valid.";
          break;
        case "note":
          if (typeof s.text !== "string" || s.text.length > 300) return "A note is too long.";
          break;
        case "webhook":
          if (typeof s.url !== "string" || s.url.length > 300) return "A web address is too long.";
          break;
        case "stop": break;
        case "if": {
          if (typeof s.tag !== "string" || s.tag.length > 60 || !Array.isArray(s.yes) || !Array.isArray(s.no)) return "A Yes/No step is not valid.";
          if (i !== seq.length - 1) return "A Yes/No step has to be the last step of its path.";
          const bad = walk(s.yes, depth + 1) ?? walk(s.no, depth + 1);
          if (bad) return bad;
          break;
        }
        default: return "A step has an unknown type.";
      }
      if (mode === "publish") {
        const why = stepProblem(s);
        if (why) return `${stepTitle(s)}: ${why}`;
      }
    }
    return null;
  };
  const bad = walk(steps, 1);
  if (bad) return bad;
  if (mode === "publish" && !steps.length) return "Add at least one step first.";
  return null;
}
/** The strict check, as a type guard. What the engine and the old callers mean by "valid". */
export function validSteps(steps: unknown): steps is Step[] { return checkSteps(steps, "publish") === null; }

/* ---------------------------------------------------------------- paths */

export type Path = string[];
export const encodePath = (p: Path) => p.join("/");
export const decodePath = (s: string) => (s ? s.split("/") : []);

type Spot = { step: Step; seq: Step[]; index: number };
export function resolve(steps: Step[], path: Path): Spot | null {
  let seq: Step[][] = [steps];
  let hit: Spot | null = null;
  for (const id of path) {
    let found: Spot | null = null;
    for (const s of seq) {
      const index = s.findIndex((x) => x.id === id);
      if (index >= 0) { found = { step: s[index], seq: s, index }; break; }
    }
    if (!found) return null;
    hit = found;
    seq = found.step.type === "if" ? [found.step.yes, found.step.no] : [];
  }
  return hit;
}

/**
 * Where a run stands, from its row. A row from before paths has only `step`, the index in the top list;
 * `path` "" means the run has nothing left to do.
 */
export function startPath(steps: Step[], row: { step: number; path?: string | null }): Path | null {
  if (row.path === "") return null;
  if (typeof row.path === "string") { const p = decodePath(row.path); return resolve(steps, p) ? p : null; }
  return steps[row.step] ? [steps[row.step].id] : null;
}

/** The place after this one, or null when the run ends. `tagged` is the answer for an `if`. */
export function after(steps: Step[], path: Path, tagged = false): Path | null {
  const r = resolve(steps, path);
  if (!r) return null;
  if (r.step.type === "stop") return null;
  if (r.step.type === "if") {
    const first = (tagged ? r.step.yes : r.step.no)[0];
    return first ? [...path, first.id] : null;
  }
  const next = r.seq[r.index + 1];
  return next ? [...path.slice(0, -1), next.id] : null;
}

/** Index of the top-level ancestor, for the old `step` column. */
export const topIndex = (steps: Step[], path: Path | null) => (path ? Math.max(0, steps.findIndex((s) => s.id === path[0])) : steps.length);

/* ------------------------------------------------------------ test run */

export type TraceLine = { id: string; text: string; tone: "did" | "stop" };
/**
 * A dry run: the SAME path logic the engine uses, for one person's tags, with
 * nothing sent, written or called. Waits are taken as elapsed. A tag step
 * changes the tags it goes on to check, as it would for real.
 */
export function simulate(steps: Step[], who: { tags: string[]; canEmail: boolean }): { lines: TraceLine[]; reached: string[]; end: "finished" | "stopped" | "blocked" } {
  const tags = new Set(who.tags.map(normTag));
  const lines: TraceLine[] = [];
  const reached: string[] = [];
  let path = startPath(steps, { step: 0, path: null });
  let end: "finished" | "stopped" | "blocked" = "finished";
  for (let guard = 0; path && guard < MAX_STEPS + 2; guard++) {
    const r = resolve(steps, path);
    if (!r) break;
    const s = r.step;
    reached.push(s.id);
    let tagged = false;
    const say = (text: string, tone: TraceLine["tone"] = "did") => lines.push({ id: s.id, text, tone });
    if (s.type === "wait") say(`Waits ${stepSummary(s).toLowerCase()}, then goes on`);
    else if (s.type === "email") {
      if (!who.canEmail) { say("Stops here: this person cannot be emailed (they unsubscribed, bounced, or did not ask to hear from us)", "stop"); end = "blocked"; break; }
      say(`Email “${s.subject.trim() || "(no subject)"}” would be sent`);
    } else if (s.type === "tag") {
      const t = normTag(s.tag);
      if (s.remove) tags.delete(t); else if (t) tags.add(t);
      say(`${s.remove ? "Removes" : "Adds"} the tag “${t || "…"}”`);
    } else if (s.type === "stop_if_tag") {
      if (tags.has(normTag(s.tag))) { say(`Has the tag “${normTag(s.tag)}”, so the run stops here`, "stop"); end = "stopped"; break; }
      say(`Does not have the tag “${normTag(s.tag)}”, so it goes on`);
    } else if (s.type === "if") {
      tagged = tags.has(normTag(s.tag));
      say(`Has the tag “${normTag(s.tag)}”? ${tagged ? "Yes" : "No"}`);
    } else if (s.type === "note") say("Would add a note to their record");
    else if (s.type === "webhook") { let host = "a web address"; try { host = new URL(s.url).hostname; } catch { /* shown generically */ } say(`Would call ${host}`); }
    else if (s.type === "stop") { say("Stops here", "stop"); end = "stopped"; break; }
    path = after(steps, path, tagged);
  }
  return { lines, reached, end };
}

/* ------------------------------------------------------------- editing */

export const newId = () => Math.random().toString(36).slice(2, 10);
const rid = newId;

export function blankStep(type: StepType): Step {
  const id = rid();
  switch (type) {
    case "wait": return { id, type, days: 1, hours: 0, weekdays: [], hour: null };
    case "email": return { id, type, subject: "", design: { subject: "", preheader: "", heading: "", blocks: [{ id: rid(), type: "text", text: "Hi {{contact.first_name | \"there\"}}," }] } };
    case "tag": return { id, type, tag: "", remove: false };
    case "stop_if_tag": return { id, type, tag: "" };
    case "note": return { id, type, text: "" };
    case "webhook": return { id, type, url: "https://" };
    case "if": return { id, type, tag: "", yes: [], no: [] };
    case "stop": return { id, type };
  }
}

/** Where a new step goes: a place in a list. `parent` null is the top list. */
export type Slot = { parent: string | null; branch: "yes" | "no" | null; index: number };

const listAt = (steps: Step[], slot: Pick<Slot, "parent" | "branch">): Step[] | null => {
  if (!slot.parent) return steps;
  const p = findStep(steps, slot.parent)?.step;
  return p?.type === "if" && slot.branch ? p[slot.branch] : null;
};
const edit = (steps: Step[], fn: (copy: Step[]) => void) => { const copy = structuredClone(steps); fn(copy); return copy; };

/** Inserts a step. An `if` takes everything after it onto its `no` path, because nothing can follow a branch. */
export function insertAt(steps: Step[], slot: Slot, step: Step): { steps: Step[]; moved: number } {
  let moved = 0;
  const next = edit(steps, (copy) => {
    const list = listAt(copy, slot);
    if (!list) return;
    if (step.type === "if") { step.no = list.splice(slot.index); moved = step.no.length; }
    list.splice(slot.index, 0, step);
  });
  return { steps: next, moved };
}
export function removeStep(steps: Step[], id: string): Step[] {
  return edit(steps, (copy) => { const f = findStep(copy, id); if (f) f.seq.splice(f.index, 1); });
}
export function updateStep(steps: Step[], id: string, patch: Partial<Step>): Step[] {
  return edit(steps, (copy) => { const f = findStep(copy, id); if (f) Object.assign(f.step, patch); });
}
/** A copy right after the original, with fresh ids all the way down. A copied `if` is only allowed where nothing follows it. */
export function duplicateStep(steps: Step[], id: string): { steps: Step[]; id: string } | null {
  const f = findStep(steps, id);
  if (!f) return null;
  if (f.step.type === "if" && f.index !== f.seq.length - 1) return null;
  const clone = structuredClone(f.step);
  forEachStep([clone], (s) => { s.id = rid(); });
  return { steps: edit(steps, (copy) => { const g = findStep(copy, id); g?.seq.splice(g.index + 1, 0, clone); }), id: clone.id };
}
/** The depth a step added at this slot would have (1 is the top list). */
export function slotDepth(steps: Step[], slot: Slot): number {
  return slot.parent ? (findStep(steps, slot.parent)?.depth ?? 1) + 1 : 1;
}

/* The email step's single text box is the first text block of its design. */
export function emailText(s: EmailStep): string {
  const b = s.design.blocks.find((x) => x.type === "text");
  return b && b.type === "text" ? b.text : "";
}
export function withEmailText(s: EmailStep, text: string): Design {
  const i = s.design.blocks.findIndex((x) => x.type === "text");
  const blocks = [...s.design.blocks];
  if (i >= 0) blocks[i] = { ...blocks[i], text } as Design["blocks"][number];
  else blocks.unshift({ id: rid(), type: "text", text });
  return { ...s.design, blocks };
}
export function withSubject(s: EmailStep, subject: string): Design {
  /* The heading follows the subject until somebody writes their own. */
  const follows = !s.design.heading || s.design.heading === s.subject;
  return { ...s.design, subject, heading: follows ? subject : s.design.heading };
}

/* -------------------------------------------------------------- layout */

export const BOX = { w: 260, h: 80, stopW: 200, stopH: 64, gx: 56, gy: 72 };
export type LNode = { kind: "node"; id: string; step: Step | null; x: number; y: number; w: number; h: number };
export type LAdd = { kind: "add"; key: string; slot: Slot; x: number; y: number; label: string };
export type LTag = { kind: "tag"; key: string; branch: "yes" | "no"; x: number; y: number };
export type LEdge = { from: string; to: string | null; x1: number; y1: number; x2: number; y2: number; straight: boolean; d: string };
export type Layout = { items: (LNode | LAdd | LTag)[]; edges: LEdge[]; width: number; height: number };

const widthOf = (seq: Step[]): number => {
  let w = BOX.w;
  for (const s of seq) if (s.type === "if") w = Math.max(w, widthOf(s.yes) + widthOf(s.no) + BOX.gx);
  return w;
};
const draw = (e: Omit<LEdge, "d">) => { const my = (e.y1 + e.y2) / 2; return e.straight ? `M${e.x1} ${e.y1} L${e.x2} ${e.y2}` : `M${e.x1} ${e.y1} C ${e.x1} ${my}, ${e.x2} ${my}, ${e.x2} ${e.y2}`; };
const link = (from: string, to: string | null, x1: number, y1: number, x2: number, y2: number, straight = false): Omit<LEdge, "d"> => ({ from, to, x1, y1, x2, y2, straight });

/**
 * Where everything sits. Each list is a column; an `if` splits into two columns
 * side by side. `items` come out in reading order (a node, the + after it, the
 * next node...) so the DOM, and therefore Tab, follows the flow.
 */
export function layout(steps: Step[]): Layout {
  const items: Layout["items"] = [];
  const edges: Omit<LEdge, "d">[] = [];
  const trig: LNode = { kind: "node", id: "trig", step: null, x: -BOX.w / 2, y: 0, w: BOX.w, h: BOX.h };
  items.push(trig);

  const lay = (seq: Step[], parent: Slot["parent"], branch: Slot["branch"], cx: number, y: number, from: LNode, fromId: string): number => {
    const key = `${parent ?? "top"}:${branch ?? "-"}`;
    let cy = y;
    let prev = from;
    const head = parent !== null; // the first edge of a branch leaves the `if`; the top list leaves the trigger
    if (!seq.length) {
      const ay = prev.y + prev.h;
      const endY = head ? cy : ay + BOX.gy - 10;
      edges.push(link(fromId, null, prev.x + prev.w / 2, ay, cx, endY));
      items.push({ kind: "add", key: `${key}:0`, slot: { parent, branch, index: 0 }, x: cx, y: head ? endY - 24 : endY, label: head ? `Add a step on the ${branch === "yes" ? "Yes" : "No"} path` : "Add the first step" });
      return 0;
    }
    seq.forEach((s, i) => {
      const small = s.type === "stop";
      const w = small ? BOX.stopW : BOX.w, h = small ? BOX.stopH : BOX.h;
      const node: LNode = { kind: "node", id: s.id, step: s, x: cx - w / 2, y: cy, w, h };
      const ax = prev.x + prev.w / 2, ay = prev.y + prev.h;
      const first = i === 0;
      /* the + that sits before this node */
      items.push({ kind: "add", key: `${key}:${i}`, slot: { parent, branch, index: i }, x: cx, y: first && head ? cy - 24 : (ay + cy) / 2, label: first && !head ? "Add a step first" : first ? `Add a step first on the ${branch === "yes" ? "Yes" : "No"} path` : "Add a step here" });
      edges.push(link(fromId, s.id, ax, ay, cx, cy));
      items.push(node);
      if (s.type === "if") {
        const wy = widthOf(s.yes), wn = widthOf(s.no), tot = wy + wn + BOX.gx;
        const x1 = cx - tot / 2 + wy / 2, x2 = cx + tot / 2 - wn / 2, by = cy + h + BOX.gy;
        items.push({ kind: "tag", key: `${s.id}:yes`, branch: "yes", x: cx + (x1 - cx) * 0.5, y: cy + h + 34 });
        const hy = lay(s.yes, s.id, "yes", x1, by, node, s.id);
        items.push({ kind: "tag", key: `${s.id}:no`, branch: "no", x: cx + (x2 - cx) * 0.5, y: cy + h + 34 });
        const hn = lay(s.no, s.id, "no", x2, by, node, s.id);
        cy = by + Math.max(hy, hn);
        prev = node;
        return;
      }
      prev = node;
      cy += h + BOX.gy;
      fromId = s.id;
    });
    const last = seq[seq.length - 1];
    if (last.type !== "if" && last.type !== "stop") {
      const x = prev.x + prev.w / 2, yb = prev.y + prev.h;
      edges.push(link(last.id, null, x, yb, x, yb + 40, true));
      items.push({ kind: "add", key: `${key}:${seq.length}`, slot: { parent, branch, index: seq.length }, x, y: yb + 34, label: "Add a step after this one" });
    }
    return cy - y;
  };

  lay(steps, null, null, 0, BOX.h + BOX.gy, trig, "trig");

  const nodes = items.filter((i): i is LNode => i.kind === "node");
  const minX = Math.min(...nodes.map((n) => n.x)) - 40;
  const maxX = Math.max(...nodes.map((n) => n.x + n.w)) + 40;
  const maxY = Math.max(...nodes.map((n) => n.y + n.h)) + 134;
  const dx = -minX, dy = 24;
  for (const i of items) { i.x += dx; i.y += dy; }
  const placed = edges.map((e) => { const m = { ...e, x1: e.x1 + dx, y1: e.y1 + dy, x2: e.x2 + dx, y2: e.y2 + dy }; return { ...m, d: draw(m) }; });
  return { items, edges: placed, width: maxX - minX, height: maxY + dy };
}
