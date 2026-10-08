import { expect, type Locator, type Page } from "@playwright/test";
import { join } from "node:path";

/**
 * Shared by onboarding-a11y.spec.ts.
 *
 * Everything here drives the form the way a keyboard user does: Tab and
 * Shift+Tab move focus, Enter and Space press, arrow keys move inside a choice
 * group. The only mouse-free step is the page focus, which Playwright gives on
 * navigation. `tabTo` finds a control by Tab order rather than by clicking it.
 *
 * Checks run inside the page (`audit`, `focusSweep`) and record every problem
 * in a `Log`, so one walk can report all of its findings instead of stopping at
 * the first one. A spec then asserts each category with `expectClean`.
 */

export type Category =
  | "keyboard"
  | "names"
  | "duplicates"
  | "headings"
  | "required"
  | "errors"
  | "focus"
  | "motion"
  | "overflow"
  | "axe"
  | "colours";

export class Log {
  readonly items: string[] = [];
  readonly counts: Record<string, number> = {};
  add(cat: Category, screen: string, control: string, problem: string) {
    this.items.push(`[${cat}] ${screen} | ${control} | ${problem}`);
  }
  count(name: string, n = 1) {
    this.counts[name] = (this.counts[name] ?? 0) + n;
  }
  of(cat: Category) {
    return this.items.filter((item) => item.startsWith(`[${cat}]`));
  }
}

/** Soft, so every category reports even when an earlier one failed. */
export function expectClean(log: Log, cat: Category) {
  expect.soft(log.of(cat), `${cat}: ${log.of(cat).length} finding(s)`).toEqual([]);
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

/* ----------------------------------------------------------- keyboard moves */

/** Tabs (or Shift+Tabs, when the target is behind focus) until `target` has focus. */
export async function tabTo(page: Page, target: Locator, label: string) {
  await target.evaluate((el) => el.setAttribute("data-a11y-target", "1"));
  try {
    for (let i = 0; i < 300; i++) {
      const dir = await page.evaluate(() => {
        const active = document.activeElement;
        const goal = document.querySelector('[data-a11y-target="1"]');
        if (!goal) return "missing";
        if (active === goal) return "here";
        if (!active || active === document.body) return "fwd";
        return active.compareDocumentPosition(goal) & Node.DOCUMENT_POSITION_FOLLOWING ? "fwd" : "back";
      });
      if (dir === "missing") throw new Error(`${label} is no longer on the page`);
      if (dir === "here") return;
      await page.keyboard.press(dir === "fwd" ? "Tab" : "Shift+Tab");
    }
    throw new Error(`Keyboard focus could not reach ${label}`);
  } finally {
    await target.evaluate((el) => el.removeAttribute("data-a11y-target")).catch(() => {});
  }
}

/** Presses Down or Up until the focused option's text starts with `want`. */
export async function arrowUntil(page: Page, want: RegExp, label: string) {
  for (let i = 0; i < 80; i++) {
    const text = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      const id = active?.getAttribute("aria-activedescendant");
      const el = id ? document.getElementById(id) : active;
      return (el?.textContent ?? "").replace(/\s+/g, " ").trim();
    });
    if (want.test(text)) return;
    await page.keyboard.press("ArrowDown");
  }
  throw new Error(`Arrow keys never reached ${label}`);
}

/*  An option's name runs its help straight on ("One piece or a small setFor
    example"), so a label ends at a space, the end, or the capital that starts
    the help. That keeps "Yes" from matching "Yes, I know" and "Logo" from
    matching "LogoThe mark". */
const exactOrWord = (label: string) => new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\s|[A-Z(]|$)`);

/** Opens the service picker, chooses a service with the arrows, and presses Next. */
export async function startByKeyboard(page: Page, service: RegExp) {
  await page.goto("/onboarding", { waitUntil: "domcontentloaded" });
  const picker = page.locator("#ob-service");
  await expect(picker).toBeVisible({ timeout: 60_000 });
  await tabTo(page, picker, "the service picker");
  await page.keyboard.press("Enter");
  if ((await picker.getAttribute("aria-expanded")) !== "true") await page.keyboard.press("Space");
  await expect(picker).toHaveAttribute("aria-expanded", "true");
  await arrowUntil(page, service, "the service option");
  await page.keyboard.press("Enter");
  await expect(picker).toHaveAttribute("aria-expanded", "false");
  /* The choice is committed a moment after the list closes; Next stays
     disabled until it is, so wait for it rather than pressing into nothing. */
  const next = page.locator(".ob--intro .ob__btn--go").first();
  await expect(next, "Next on the first screen is enabled once a service is chosen").toBeEnabled({ timeout: 10_000 });
  await tabTo(page, next, "Next on the first screen");
  await page.keyboard.press("Enter");
}

/* ------------------------------------------------------------- answering */

/** After a choice the focus must stay on the question, or the next Tab starts again from the top of the page. */
async function keepsFocus(page: Page, log: Log, screen: string, key: string, what: string) {
  const lost = await page.evaluate(() => {
    const a = document.activeElement;
    return !a || a === document.body;
  });
  if (lost) log.add("keyboard", screen, key, `focus fell to the page body after ${what}`);
  else log.count("focusKept");
}

async function focusedIndex(group: Locator) {
  return group.evaluateAll((els) => els.indexOf(document.activeElement as HTMLElement));
}

async function keyboardRadio(page: Page, q: Locator, key: string, label: string, log: Log, screen: string) {
  const radios = q.locator('[role="radio"], input[type="radio"]');
  const names = await radios.evaluateAll((els) =>
    els.map((e) => ((e as HTMLElement).getAttribute("aria-label") || e.textContent || e.closest("label")?.textContent || "").replace(/\s+/g, " ").trim()),
  );
  const at = names.findIndex((t) => t === label) >= 0 ? names.findIndex((t) => t === label) : names.findIndex((t) => exactOrWord(label).test(t));
  if (at < 0) {
    log.add("keyboard", screen, key, `option "${label}" is not in the group (${names.length} options: ${JSON.stringify(names.slice(0, 4))})`);
    return;
  }
  const target = radios.nth(at);
  /* The browser's own entry point: the checked option if there is one, else
     the first option that can take focus. */
  const entry = await radios.evaluateAll((els) => {
    const stops = els.map((e, i) => ({ i, t: (e as HTMLElement).tabIndex, c: (e as HTMLElement).getAttribute("aria-checked") === "true" || (e as HTMLInputElement).checked }))
      .filter((x) => x.t >= 0);
    return (stops.find((x) => x.c) ?? stops[0] ?? { i: 0 }).i;
  });
  await tabTo(page, radios.nth(entry), `the "${key}" group`);
  let now = await focusedIndex(radios);
  let moved = false;
  for (let step = 0; step < names.length * 2 && now !== at; step++) {
    await page.keyboard.press(at > now ? "ArrowDown" : "ArrowUp");
    const after = await focusedIndex(radios);
    if (after === now) break;
    moved = true;
    now = after;
  }
  if (now !== at) {
    log.add("keyboard", screen, key, `arrow keys do not move focus between options (stuck on option ${now + 1} of ${names.length}); fell back to Tab`);
    await tabTo(page, target, `"${label}"`);
  } else if (moved) log.count("arrowMoves");
  if (!(await target.evaluate((e) => e.getAttribute("aria-checked") === "true" || (e as HTMLInputElement).checked))) {
    await page.keyboard.press("Space");
  }
  const chosen = await target.evaluate((e) => e.getAttribute("aria-checked") === "true" || (e as HTMLInputElement).checked);
  if (!chosen) log.add("keyboard", screen, key, `Space did not choose "${label}"`);
  else log.count("choicesByKeyboard");
  await keepsFocus(page, log, screen, key, `choosing "${label}"`);
}

async function keyboardCheckbox(page: Page, q: Locator, key: string, label: string, log: Log, screen: string) {
  const boxes = q.locator('[role="checkbox"]');
  const names = await boxes.evaluateAll((els) => els.map((e) => (e.textContent ?? "").replace(/\s+/g, " ").trim()));
  const at = names.findIndex((t) => exactOrWord(label).test(t));
  if (at < 0) {
    log.add("keyboard", screen, key, `option "${label}" is not in the list (${names.length} options: ${JSON.stringify(names.slice(0, 4))})`);
    return;
  }
  const target = boxes.nth(at);
  await tabTo(page, target, `"${label}"`);
  if ((await target.getAttribute("aria-checked")) !== "true") await page.keyboard.press("Space");
  if ((await target.getAttribute("aria-checked")) !== "true") log.add("keyboard", screen, key, `Space did not tick "${label}"`);
  else log.count("choicesByKeyboard");
  await keepsFocus(page, log, screen, key, `ticking "${label}"`);
}

async function keyboardSelect(page: Page, q: Locator, key: string, label: string, log: Log, screen: string) {
  const box = q.locator('[role="combobox"]').first();
  await tabTo(page, box, `the "${key}" dropdown`);
  await page.keyboard.press("Enter");
  if ((await box.getAttribute("aria-expanded")) !== "true") await page.keyboard.press("Space");
  if ((await box.getAttribute("aria-expanded")) !== "true") {
    log.add("keyboard", screen, key, "Enter and Space both fail to open the dropdown");
    return;
  }
  await arrowUntil(page, exactOrWord(label), `"${label}" in the "${key}" list`);
  await page.keyboard.press("Enter");
  await expect(box).toHaveAttribute("aria-expanded", "false");
  log.count("choicesByKeyboard");
  await keepsFocus(page, log, screen, key, `choosing "${label}" in the list`);
}

async function keyboardText(page: Page, q: Locator, key: string, value: string, kind: string) {
  const field = kind === "textarea" ? q.locator("textarea").first() : q.locator('input:not([type="hidden"]):not([type="file"])').first();
  await tabTo(page, field, `the "${key}" field`);
  await page.keyboard.type(value);
}

/** Answers one question with the keyboard, whichever control it uses. */
export async function keyboardAnswer(page: Page, key: string, value: string | string[], log: Log, screen: string) {
  const q = page.locator(`[data-field="${key}"]`).first();
  const kind = await q.evaluate((el) => {
    if (el.querySelector('[role="combobox"]')) return "select";
    if (el.querySelector("textarea")) return "textarea";
    if (el.querySelector('[role="radio"], input[type="radio"]')) return "radio";
    if (el.querySelector('[role="checkbox"]')) return "checkbox";
    if (el.querySelector('input:not([type="hidden"]):not([type="file"])')) return "text";
    return "other";
  });
  const labels = Array.isArray(value) ? value : [value];
  if (kind === "other") {
    log.add("keyboard", screen, key, "answered question has no keyboard control in the walk");
    return;
  }
  if (kind === "text" || kind === "textarea") return keyboardText(page, q, key, String(value), kind);
  for (const label of labels) {
    if (kind === "radio") await keyboardRadio(page, q, key, label, log, screen);
    else if (kind === "checkbox") await keyboardCheckbox(page, q, key, label, log, screen);
    else await keyboardSelect(page, q, key, label, log, screen);
  }
}

/** Answers every visible question on this screen that the map has an answer for. */
export async function answerScreen(page: Page, answers: Record<string, string | string[]>, log: Log, screen: string) {
  const done = new Set<string>();
  for (let pass = 0; pass < 6; pass++) {
    const keys = await page.locator(".ob__fields [data-field]:visible").evaluateAll((els) => els.map((e) => e.getAttribute("data-field") ?? ""));
    const todo = keys.filter((k) => k in answers && !done.has(k));
    if (!todo.length) return;
    for (const key of todo) {
      done.add(key);
      await keyboardAnswer(page, key, answers[key], log, screen);
    }
  }
}

/** Tabs to the screen's forward button, presses it, and says where the form went. */
export async function pressNext(page: Page, title: string) {
  const next = page.locator(".ob__stepNext:visible").first();
  if (!(await next.isVisible().catch(() => false))) {
    await next.waitFor({ state: "visible", timeout: 15_000 }).catch(async () => {
      const shown = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>("button")).filter((b) => b.offsetParent !== null).map((b) => b.textContent?.trim()).slice(0, 25));
      throw new Error(`no visible Next button on "${title}"; visible buttons: ${JSON.stringify(shown)}`);
    });
  }
  await tabTo(page, next, `Next on "${title}"`);
  await page.keyboard.press("Enter");
  const outcome = await page.waitForFunction((from: string) => {
    if (document.querySelector(".ob__review")) return "review";
    const err = Array.from(document.querySelectorAll<HTMLElement>(".ob__err")).find((e) => e.offsetParent !== null);
    if (err) return `error: ${(err.textContent ?? "").replace(/\s+/g, " ").trim()}`;
    const h = Array.from(document.querySelectorAll<HTMLElement>(".ob h2")).find((e) => e.offsetParent !== null);
    return h && (h.textContent ?? "").replace(/\s+/g, " ").trim() !== from ? "moved" : false;
  }, title, { timeout: 15_000 });
  const value = String(await outcome.jsonValue());
  if (value.startsWith("error")) throw new Error(`"${title}" would not go on: ${value}`);
}

/** Walks from the current screen to the review (or to a screen named by `stopAt`). */
export async function walkKeyboard(
  page: Page,
  answers: Record<string, string | string[]>,
  log: Log,
  screenHook: (title: string, first: boolean) => Promise<void>,
  stopAt?: RegExp,
): Promise<string[]> {
  const titles: string[] = [];
  for (let n = 0; n < 14; n++) {
    if (await page.locator(".ob__review:visible").count()) return titles;
    const title = norm(await page.locator(".ob h2:visible").first().innerText());
    if (stopAt?.test(title)) return titles;
    titles.push(title);
    log.count("screens");
    await screenHook(title, n === 0);
    await answerScreen(page, answers, log, title);
    try {
      await pressNext(page, title);
    } catch (error) {
      const state = await page.evaluate(() => ({
        active: (document.activeElement as HTMLElement | null)?.outerHTML.slice(0, 160),
        h2: Array.from(document.querySelectorAll<HTMLElement>(".ob h2")).filter((e) => e.offsetParent !== null).map((e) => e.textContent),
        errors: Array.from(document.querySelectorAll<HTMLElement>(".ob__fErr")).map((e) => e.textContent),
      })).catch(() => null);
      throw new Error(`${(error as Error).message}\nkeyboard log: ${JSON.stringify(log.items.filter((i) => i.startsWith("[keyboard]")))}\nstate: ${JSON.stringify(state)}`);
    }
  }
  throw new Error(`No review after 14 screens: ${titles.join(" > ")}`);
}

/**
 * On the first screen, presses Next with nothing answered. The form must stop
 * there, and the error it shows must be linked to the question it is about.
 */
export async function probeRequired(page: Page, log: Log, title: string) {
  const starred = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>(".ob__fields [data-field] b")).filter((b) => b.textContent?.trim() === "*" && (b.closest("[data-field]") as HTMLElement | null)?.offsetParent !== null).length,
  );
  if (!starred) return;
  const next = page.locator(".ob__stepNext:visible").first();
  await tabTo(page, next, `Next on "${title}"`);
  await page.keyboard.press("Enter");
  const shown = await page.waitForFunction(() => {
    if (document.querySelector(".ob__review")) return "review";
    const err = Array.from(document.querySelectorAll<HTMLElement>(".ob__err")).find((e) => e.offsetParent !== null);
    return err ? "blocked" : false;
  }, undefined, { timeout: 10_000 }).then((h) => h.jsonValue()).catch(() => "none");
  if (shown !== "blocked") {
    throw new Error(`"${title}" let Next through with ${starred} required question(s) empty`);
  }
  log.count("requiredBlocks");
  /* The page checks again, now that the error is showing: the error must be
     linked to its question, and the form must still name every control. */
  await audit(page, log, `${title} (after an empty Next)`, false);
}

/* ----------------------------------------------------------- page checks */

/**
 * Names, duplicate names, headings, required state, error links, overflow and
 * (under reduced motion) running animation, measured in the page.
 */
export async function audit(page: Page, log: Log, screen: string, reduced: boolean) {
  /* Web fonts swap in after first paint, and a swap changes widths; measure after it. */
  await page.evaluate(() => document.fonts?.ready.then(() => true) ?? true);
  const found = await page.evaluate((reducedMotion: boolean) => {
    const out: { cat: string; control: string; problem: string }[] = [];
    const add = (cat: string, control: string, problem: string) => out.push({ cat, control, problem });
    const root = (document.querySelector(".ob") as HTMLElement | null) ?? document.body;
    const norm = (s: string) => s.replace(/\s+/g, " ").trim();
    const shown = (el: Element) => {
      const h = el as HTMLElement;
      if (h.closest("[hidden],[inert]")) return false;
      const cs = getComputedStyle(h);
      if (cs.display === "none" || cs.visibility === "hidden") return false;
      const r = h.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const textOf = (node: Node): string => {
      if (node.nodeType === 3) return node.textContent ?? "";
      if (!(node instanceof HTMLElement) || node.getAttribute("aria-hidden") === "true") return "";
      return Array.from(node.childNodes).map(textOf).join(" ");
    };
    const describe = (el: HTMLElement) => {
      const role = el.getAttribute("role") ? `[role=${el.getAttribute("role")}]` : "";
      const text = norm(textOf(el)).slice(0, 36) || el.getAttribute("aria-label") || "";
      const field = el.closest("[data-field]")?.getAttribute("data-field") ?? "screen";
      return `${el.tagName.toLowerCase()}${role} "${text}" (${field})`;
    };
    const nameOf = (el: HTMLElement) => {
      const lb = el.getAttribute("aria-labelledby");
      if (lb) {
        const parts = lb.split(/\s+/).filter(Boolean).map((id) => document.getElementById(id));
        if (parts.some((p) => !p)) add("names", describe(el), `aria-labelledby="${lb}" points at nothing on the page`);
        const t = norm(parts.filter((p): p is HTMLElement => !!p).map((p) => textOf(p)).join(" "));
        if (t) return t;
      }
      const al = norm(el.getAttribute("aria-label") ?? "");
      if (al) return al;
      const labels = (el as HTMLInputElement).labels;
      if (labels && labels.length) {
        const t = norm(Array.from(labels).map((l) => textOf(l)).join(" "));
        if (t) return t;
      }
      const role = el.getAttribute("role");
      if (el.tagName === "BUTTON" || role === "radio" || role === "checkbox" || role === "button") {
        const t = norm(textOf(el));
        if (t) return t;
      }
      return norm(el.getAttribute("title") ?? "");
    };

    /* Names and duplicates. A duplicate is only a problem inside one group,
       so the group is the question the control sits in. */
    const controls = Array.from(root.querySelectorAll<HTMLElement>(
      'button, input:not([type="hidden"]), textarea, select, [role="radio"], [role="checkbox"], [role="combobox"], [role="radiogroup"], [role="group"], [role="listbox"]',
    )).filter(shown);
    const GROUP = "[data-field], section, fieldset, [role='group'], [role='radiogroup']";
    const groups = new Map<Element, Map<string, { n: number; who: string }>>();
    for (const el of controls) {
      const name = nameOf(el);
      if (!name) add("names", describe(el), "no accessible name");
      if (!name) continue;
      const g = el.closest(GROUP) ?? root;
      const seen = groups.get(g) ?? new Map<string, { n: number; who: string }>();
      const prev = seen.get(name);
      seen.set(name, { n: (prev?.n ?? 0) + 1, who: prev?.who ?? describe(el) });
      groups.set(g, seen);
    }
    for (const seen of groups.values()) for (const [name, v] of seen) if (v.n > 1) add("duplicates", v.who, `${v.n} controls in one group share the name "${name}"`);

    /* Headings. */
    const hs = Array.from(root.querySelectorAll<HTMLElement>("h1,h2,h3,h4,h5,h6")).filter(shown).map((h) => Number(h.tagName[1]));
    if (root.querySelector(".ob__fields")) {
      const h2 = hs.filter((l) => l === 2).length;
      if (h2 !== 1) add("headings", "step", `${h2} visible h2 headings`, );
    }
    for (const h of Array.from(root.querySelectorAll<HTMLElement>("h1,h2,h3,h4,h5,h6")).filter(shown)) {
      if (h.querySelector("button, a[href], input, select, textarea")) add("headings", `h${h.tagName[1]} "${norm(h.textContent ?? "").slice(0, 40)}"`, "heading contains an interactive control, so the control's name is read as part of the heading");
    }
    for (let i = 1; i < hs.length; i++) if (hs[i] > hs[i - 1] + 1) add("headings", `h${hs[i - 1]} then h${hs[i]}`, "heading level skipped");

    /* Required state. */
    let requiredCount = 0;
    for (const f of Array.from(root.querySelectorAll<HTMLElement>("[data-field]")).filter(shown)) {
      const key = f.getAttribute("data-field") ?? "";
      const stars = Array.from(f.querySelectorAll("b")).filter((b) => b.textContent?.trim() === "*");
      if (!stars.length) continue;
      requiredCount++;
      if (stars.some((b) => b.getAttribute("aria-hidden") !== "true")) add("required", key, "required star is read aloud (not aria-hidden)");
      const ctl = f.querySelector<HTMLElement>('input:not([type="radio"]):not([type="checkbox"]):not([type="file"]), textarea, select, [role="combobox"]');
      const grp = f.querySelector<HTMLElement>('[role="radiogroup"], [role="group"]');
      const described = (el: HTMLElement) => (el.getAttribute("aria-describedby") ?? "").split(/\s+/).some((id) => /required/i.test(document.getElementById(id)?.textContent ?? ""));
      const ctlExposed = !!ctl && ((ctl as HTMLInputElement).required || ctl.getAttribute("aria-required") === "true");
      const grpExposed = !!grp && (grp.getAttribute("aria-required") === "true" || described(grp));
      if (!ctlExposed && !grpExposed) add("required", key, "required state is not exposed to assistive tech (no aria-required, no described group)");
    }

    /* Error messages must be linked to their field. */
    const errs = Array.from(root.querySelectorAll<HTMLElement>(".ob__fErr")).filter(shown);
    for (const e of errs) {
      const f = e.closest<HTMLElement>("[data-field]");
      const key = f?.getAttribute("data-field") ?? "screen";
      const linked = !!e.id && !!f && Array.from(f.querySelectorAll("[aria-describedby]")).some((c) => (c.getAttribute("aria-describedby") ?? "").split(/\s+/).includes(e.id));
      if (!linked) add("errors", key, `error "${norm(e.textContent ?? "").slice(0, 60)}" is not linked with aria-describedby`);
    }

    /* Overflow at this width. */
    const vw = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth > vw + 1) add("overflow", "document", `scrollWidth ${document.documentElement.scrollWidth} is wider than ${vw}`);
    const inScroller = (el: HTMLElement) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const o = getComputedStyle(p).overflowX;
        if (o === "auto" || o === "scroll") return true;
      }
      return false;
    };
    for (const el of Array.from(root.querySelectorAll<HTMLElement>("*")).filter((el) => shown(el) && el.getBoundingClientRect().right > vw + 1 && !inScroller(el)).slice(0, 5)) {
      add("overflow", describe(el), `reaches ${Math.round(el.getBoundingClientRect().right)}px on a ${vw}px viewport`);
    }

    /* Motion, only checked where reduced motion is requested. */
    if (reducedMotion) {
      const dur = (v: string) => Math.max(0, ...v.split(",").map((s) => (s.trim().endsWith("ms") ? parseFloat(s) / 1000 : parseFloat(s)) || 0));
      for (const a of root.getAnimations({ subtree: true })) {
        const end = Number(a.effect?.getComputedTiming().endTime ?? 0);
        if (a.playState === "running" && end > 0.01 * 1000) {
          const who = (a as CSSAnimation).animationName || (a as CSSTransition).transitionProperty || "animation";
          add("motion", `${who}`, `running for ${(end / 1000).toFixed(2)}s under reduced motion`);
        }
      }
      for (const el of [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))]) {
        const cs = getComputedStyle(el);
        if (cs.animationName !== "none" && dur(cs.animationDuration) > 0.01) add("motion", describe(el), `animation ${cs.animationName} lasts ${dur(cs.animationDuration)}s`);
        if (dur(cs.transitionDuration) > 0.01) add("motion", describe(el), `transition lasts ${dur(cs.transitionDuration)}s`);
      }
    }
    return { out, controls: controls.length, required: requiredCount, errors: errs.length };
  }, reduced);

  for (const f of found.out) log.add(f.cat as Category, screen, f.control, f.problem);
  log.count("controlsNamed", found.controls);
  log.count("requiredQuestions", found.required);
  log.count("errorsShown", found.errors);
}

/** axe-core, the rules that bear on names, roles, states and headings. */
export async function axeScreen(page: Page, log: Log, screen: string) {
  if (!(await page.evaluate(() => typeof (window as unknown as { axe?: unknown }).axe !== "undefined"))) {
    await page.addScriptTag({ path: join(process.cwd(), "node_modules", "axe-core", "axe.min.js") });
  }
  const violations = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (c: Element, o: object) => Promise<{ violations: { id: string; impact: string; nodes: { target: string[] }[] }[] }> } }).axe;
    const root = (document.querySelector(".ob") as HTMLElement | null) ?? document.body;
    const r = await axe.run(root, {
      runOnly: {
        type: "rule",
        values: [
          "label", "button-name", "input-button-name", "select-name", "aria-required-attr", "aria-valid-attr",
          "aria-valid-attr-value", "aria-allowed-attr", "aria-required-children", "aria-required-parent", "aria-roles",
          "aria-hidden-focus", "heading-order", "duplicate-id-aria", "aria-input-field-name", "aria-toggle-field-name",
          "nested-interactive", "label-title-only", "aria-command-name",
        ],
      },
    });
    return r.violations.map((v) => `${v.id} (${v.impact}) at ${v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(", ")}`);
  });
  for (const v of violations) log.add("axe", screen, v.split(" (")[0], v);
  log.count("axeRuns");
}

/* ----------------------------------------------------------- focus */

type Ring = { ow: number; os: string; oc: string; bs: string };
type Sty = { label: string; ow: number; os: string; oc: string; bs: string; focused: boolean; chain: Ring[] };

/** Tabs (or Shift+Tabs) until the control with this sweep index has focus. */
async function focusIdx(page: Page, i: number) {
  for (let s = 0; s < 300; s++) {
    const cur = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.getAttribute("data-a11y-idx") ?? null);
    if (cur === String(i)) return true;
    const key = cur !== null && Number(cur) > i ? "Shift+Tab" : "Tab";
    await page.keyboard.press(key);
  }
  return false;
}

/**
 * Tabs through every focusable control on the screen in order, and compares
 * the focused outline or ring with the same control unfocused. A ring passes
 * when the outline grew by at least 2px, or the box-shadow changed and carries
 * a spread of at least 2px. Transitions are switched off during the sweep so
 * the final ring is measured, not a fade in progress.
 */
export async function focusSweep(page: Page, log: Log, screen: string) {
  const count = await page.evaluate(() => {
    const root = (document.querySelector(".ob") as HTMLElement | null) ?? document.body;
    document.querySelectorAll("[data-a11y-idx]").forEach((e) => e.removeAttribute("data-a11y-idx"));
    const shown = (h: HTMLElement) => {
      const cs = getComputedStyle(h);
      const r = h.getBoundingClientRect();
      return cs.display !== "none" && cs.visibility !== "hidden" && r.width > 0 && r.height > 0 && !h.closest("[hidden],[inert]");
    };
    /* A native radio group has one Tab stop: its checked option, else its first. */
    const nativeStop = (el: HTMLInputElement) => {
      if (el.checked) return true;
      const group = Array.from(document.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${el.name}"]`));
      return group.some((g) => g.checked) ? false : group[0] === el;
    };
    const els = Array.from(root.querySelectorAll<HTMLElement>('a[href], button, input:not([type="hidden"]), textarea, select, [role="radio"], [role="checkbox"], [role="combobox"], [tabindex]'))
      .filter((el) => el.tabIndex >= 0 && !el.matches(":disabled") && shown(el))
      .filter((el) => !(el instanceof HTMLInputElement && el.type === "radio") || (el.name ? nativeStop(el) : true));
    els.forEach((el, i) => el.setAttribute("data-a11y-idx", String(i)));
    return els.length;
  });

  const style = (i: number) => page.evaluate((i: number) => {
    const el = document.querySelector<HTMLElement>(`[data-a11y-idx="${i}"]`);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const who = `${el.tagName.toLowerCase()}${el.getAttribute("role") ? `[role=${el.getAttribute("role")}]` : ""} "${(el.textContent || el.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().slice(0, 30)}"`;
    const chain: Ring[] = [];
    let node: HTMLElement | null = el;
    for (let k = 0; node && k < 5; k++, node = node.parentElement) {
      const c = getComputedStyle(node);
      chain.push({ ow: parseFloat(c.outlineWidth), os: c.outlineStyle, oc: c.outlineColor, bs: c.boxShadow });
      if (node.hasAttribute("data-field")) break;
    }
    return { label: who, ow: parseFloat(cs.outlineWidth), os: cs.outlineStyle, oc: cs.outlineColor, bs: cs.boxShadow, focused: document.activeElement === el, chain };
  }, i) as Promise<Sty | null>;

  const ringPx = (s: Ring) => (s.os !== "none" && s.ow > 0 && s.oc !== "transparent" && !/^rgba\(.*,\s*0\)$/.test(s.oc) ? s.ow : 0);
  const shadowPx = (bs: string) => (bs === "none" ? 0 : Math.max(0, ...(bs.match(/-?[\d.]+px/g) ?? []).map(parseFloat)));
  /* The control's own ring, or a ring its question draws around it (the phone
     field's wrapper, for example), counts as the focus indicator. */
  const judge = (f: Sty, u: Sty) => {
    let pass = false;
    let detail = "";
    f.chain.forEach((fr, k) => {
      const ur = u.chain[k] ?? fr;
      const gain = ringPx(fr) - ringPx(ur);
      const shadowRing = fr.bs !== ur.bs && shadowPx(fr.bs) >= 2;
      if (gain >= 2 || shadowRing) pass = true;
      if (k === 0) detail = `outline ${fr.ow}px ${fr.os} ${fr.oc} vs ${ur.ow}px ${ur.os}; box-shadow "${fr.bs}" vs "${ur.bs}"`;
    });
    log.count("focusChecked");
    if (pass) log.count("focusPassed");
    else log.add("focus", screen, f.label, `no focus ring on the control or its question: ${detail}`);
  };

  const killer = await page.addStyleTag({ content: "*,*::before,*::after{transition:none!important}" });
  const focused: Record<number, Sty | null> = {};
  try {
    for (let i = 0; i < count; i++) {
      if (!(await focusIdx(page, i))) {
        log.add("focus", screen, `control ${i}`, "Tab order did not reach this control in DOM order");
        break;
      }
      focused[i] = await style(i);
      if (i > 0 && focused[i - 1] && focused[i - 1]!.focused !== undefined) {
        const u = await style(i - 1);
        if (u) judge(focused[i - 1]!, u);
      }
      if (i === count - 1) {
        await page.keyboard.press("Tab");
        const u = await style(i);
        if (u && focused[i]) judge(focused[i]!, u);
      }
    }
  } finally {
    await killer.evaluate((n) => (n as HTMLStyleElement).remove()).catch(() => {});
    await page.evaluate(() => document.querySelectorAll("[data-a11y-idx]").forEach((e) => e.removeAttribute("data-a11y-idx")));
  }
}
