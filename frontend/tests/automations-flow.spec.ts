import { expect, test } from "@playwright/test";
import {
  after, blankStep, checkSteps, duplicateStep, encodePath, insertAt, layout, problems, resolve, simulate, slotDepth, startPath,
  type EmailStep, type IfStep, type Step,
} from "../lib/automations-flow";

/* The flow rules as pure functions: no browser, no server, no database. */

const email = (id: string, subject = "Hello"): Step => ({ ...(blankStep("email") as EmailStep), id, subject });
const wait = (id: string): Step => ({ ...blankStep("wait"), id } as Step);
const tag = (id: string, t: string, remove = false): Step => ({ id, type: "tag", tag: t, remove });
const check = (id: string, t: string, yes: Step[], no: Step[]): IfStep => ({ id, type: "if", tag: t, yes, no });

/* welcome email, wait, then: client? yes -> stop, no -> email + tag */
const flow = (): Step[] => [
  email("welcome"),
  wait("w1"),
  check("isclient", "client", [{ id: "end", type: "stop" }], [email("pitch", "Our work"), tag("mark", "nurtured")]),
];

test("an if picks Yes when the person has the tag, No when they do not", () => {
  const yes = simulate(flow(), { tags: ["client"], canEmail: true });
  expect(yes.reached).toEqual(["welcome", "w1", "isclient", "end"]);
  expect(yes.end).toBe("stopped");
  const no = simulate(flow(), { tags: ["newsletter"], canEmail: true });
  expect(no.reached).toEqual(["welcome", "w1", "isclient", "pitch", "mark"]);
  expect(no.end).toBe("finished");
});

test("tags are compared the way the engine compares them (trimmed, lower case)", () => {
  const r = simulate([check("c", "  Client ", [email("y")], [email("n")])], { tags: ["CLIENT"], canEmail: true });
  expect(r.reached).toEqual(["c", "y"]);
});

test("a tag step changes what a later check sees", () => {
  const steps: Step[] = [tag("t", "vip"), check("c", "vip", [email("y")], [email("n")])];
  expect(simulate(steps, { tags: [], canEmail: true }).reached).toEqual(["t", "c", "y"]);
  const removed: Step[] = [tag("t", "vip", true), check("c", "vip", [email("y")], [email("n")])];
  expect(simulate(removed, { tags: ["vip"], canEmail: true }).reached).toEqual(["t", "c", "n"]);
});

test("a wait is passed and logged; an email to someone who cannot be emailed ends the run", () => {
  const r = simulate(flow(), { tags: [], canEmail: false });
  expect(r.end).toBe("blocked");
  expect(r.reached).toEqual(["welcome"]);
  const w = simulate([wait("w"), email("e")], { tags: [], canEmail: true });
  expect(w.lines[0].text).toMatch(/^Waits 1 day/);
  expect(w.reached).toEqual(["w", "e"]);
});

test("the old stop-if-tag step still stops, and still lets others through", () => {
  const steps: Step[] = [{ id: "s", type: "stop_if_tag", tag: "unsubscribed-early" }, email("e")];
  expect(simulate(steps, { tags: ["unsubscribed-early"], canEmail: true }).end).toBe("stopped");
  expect(simulate(steps, { tags: [], canEmail: true }).reached).toEqual(["s", "e"]);
});

test("the cursor is one path: next sibling, into a branch, and the end of a branch ends the run", () => {
  const f = flow();
  expect(after(f, ["welcome"])).toEqual(["w1"]);
  expect(after(f, ["w1"])).toEqual(["isclient"]);
  expect(after(f, ["isclient"], true)).toEqual(["isclient", "end"]);
  expect(after(f, ["isclient"], false)).toEqual(["isclient", "pitch"]);
  expect(after(f, ["isclient", "pitch"])).toEqual(["isclient", "mark"]);
  /* last step of a branch: nothing follows, the run is over */
  expect(after(f, ["isclient", "mark"])).toBeNull();
  /* a Stop ends it, and an empty branch ends it */
  expect(after(f, ["isclient", "end"])).toBeNull();
  expect(after([check("c", "x", [], [email("n")])], ["c"], true)).toBeNull();
  /* the last top-level step ends it too */
  expect(after([email("only")], ["only"])).toBeNull();
});

test("a path survives the round trip and finds its step, however deep", () => {
  const deep: Step[] = [check("a", "x", [check("b", "y", [email("leaf")], [])], [])];
  const p = ["a", "b", "leaf"];
  expect(resolve(deep, p)?.step.id).toBe("leaf");
  expect(startPath(deep, { step: 0, path: encodePath(p) })).toEqual(p);
  /* a path to a step that was deleted, or '' (nothing left), is the end */
  expect(startPath(deep, { step: 0, path: "a/gone" })).toBeNull();
  expect(startPath(deep, { step: 0, path: "" })).toBeNull();
});

test("a run from before paths (no path, an index) starts where its index says", () => {
  const f = flow();
  expect(startPath(f, { step: 0, path: null })).toEqual(["welcome"]);
  expect(startPath(f, { step: 1 })).toEqual(["w1"]);
  expect(startPath(f, { step: 3, path: null })).toBeNull();
});

test("every step a person can reach has its own send key", () => {
  /* the engine keys a send as auto:<run>:<step id>; ids are unique across the whole flow, branches included */
  expect(checkSteps(flow())).toBeNull();
  expect(checkSteps([email("same"), email("same")], "draft")).toMatch(/share an id/);
  expect(checkSteps([email("same"), check("c", "x", [email("same")], [])], "draft")).toMatch(/share an id/);
});

test("validation refuses an empty subject, a bad webhook, an empty tag, and too much nesting", () => {
  expect(checkSteps([email("e", "  ")])).toMatch(/subject/i);
  expect(checkSteps([{ id: "h", type: "webhook", url: "http://example.com/hook" }])).toMatch(/https/);
  expect(checkSteps([{ id: "h", type: "webhook", url: "https://localhost/x" }])).toMatch(/https/);
  expect(checkSteps([{ id: "h", type: "webhook", url: "https://10.0.0.1/x" }])).toMatch(/https/);
  expect(checkSteps([{ id: "h", type: "webhook", url: "https://hooks.example.com/x" }])).toBeNull();
  expect(checkSteps([tag("t", "")])).toMatch(/tag/i);
  expect(checkSteps([])).toMatch(/at least one/i);

  /* depth: three nested levels are fine, a fourth is not */
  const ok: Step[] = [check("a", "x", [check("b", "y", [email("e1")], [])], [])];
  expect(checkSteps(ok)).toBeNull();
  const tooDeep: Step[] = [check("a", "x", [check("b", "y", [check("c", "z", [email("e1")], [])], [])], [])];
  expect(checkSteps(tooDeep, "draft")).toMatch(/levels/);
});

test("a draft keeps half-written steps; publish does not", () => {
  const half: Step[] = [email("e", ""), { id: "h", type: "webhook", url: "https://" }, tag("t", "")];
  expect(checkSteps(half, "draft")).toBeNull();
  expect(checkSteps(half, "publish")).not.toBeNull();
  expect(problems(half).map((p) => p.id)).toEqual(["e", "h", "t"]);
  /* but a draft is still a clean shape */
  expect(checkSteps([{ id: "x", type: "nope" } as unknown as Step], "draft")).toMatch(/unknown/);
  expect(checkSteps([wait("w"), { id: "w2", type: "wait", days: 999, hours: 0, weekdays: [], hour: null }], "draft")).toMatch(/range/);
});

test("at most 40 steps, counting the ones inside branches", () => {
  const many = Array.from({ length: 41 }, (_, i) => tag(`t${i}`, "x"));
  expect(checkSteps(many, "draft")).toMatch(/40/);
  expect(checkSteps(many.slice(0, 40), "draft")).toBeNull();
  const nested: Step[] = [...many.slice(0, 20), check("c", "x", many.slice(20, 40).map((s, i) => ({ ...s, id: `y${i}` }) as Step), [])];
  expect(checkSteps(nested, "draft")).toMatch(/40/); // 20 + the check + 20 = 41
});

test("an if has to be the last step of its path, so the canvas and the engine agree", () => {
  expect(checkSteps([check("c", "x", [], []), email("after")], "draft")).toMatch(/last step/);
});

test("adding an if moves what followed it onto its No path; copies get fresh ids", () => {
  const start: Step[] = [email("a"), email("b"), email("c")];
  const { steps, moved } = insertAt(start, { parent: null, branch: null, index: 1 }, blankStep("if"));
  expect(moved).toBe(2);
  expect(steps.map((s) => s.type)).toEqual(["email", "if"]);
  const ifStep = steps[1] as IfStep;
  expect(ifStep.no.map((s) => s.id)).toEqual(["b", "c"]);
  expect(checkSteps(steps, "draft")).toBeNull();

  const dup = duplicateStep(steps, "a");
  expect(dup).not.toBeNull();
  expect(dup!.steps).toHaveLength(3);
  expect(new Set(dup!.steps.map((s) => s.id)).size).toBe(3);
  /* an if cannot be copied into the middle of a list */
  expect(duplicateStep([flow()[2], email("z")], "isclient")).toBeNull();
  expect(slotDepth(steps, { parent: ifStep.id, branch: "yes", index: 0 })).toBe(2);
});

test("the canvas layout puts Yes left of No, never overlaps two nodes, and tabs in reading order", () => {
  const g = layout(flow());
  const nodes = g.items.filter((i) => i.kind === "node");
  expect(nodes.map((n) => n.id)).toEqual(["trig", "welcome", "w1", "isclient", "end", "pitch", "mark"]);
  const at = (id: string) => nodes.find((n) => n.id === id)!;
  expect(at("end").x).toBeLessThan(at("pitch").x);
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
      expect(apart, `${a.id} overlaps ${b.id}`).toBe(true);
    }
  }
  for (const n of nodes) { expect(n.x).toBeGreaterThanOrEqual(0); expect(n.x + n.w).toBeLessThanOrEqual(g.width); expect(n.y + n.h).toBeLessThanOrEqual(g.height); }
  /* a + before every step, one after the end of the open path, and one for each side of the Yes/No split's empty lists */
  const adds = g.items.filter((i) => i.kind === "add");
  expect(adds.length).toBeGreaterThanOrEqual(6);
  expect(g.items.filter((i) => i.kind === "tag").map((t) => t.kind === "tag" && t.branch)).toEqual(["yes", "no"]);
  /* an empty flow still offers a first + */
  expect(layout([]).items.filter((i) => i.kind === "add")).toHaveLength(1);
});

test("nested splits stay apart", () => {
  const nested: Step[] = [check("a", "x", [check("b", "y", [email("e1")], [email("e2")])], [email("e3")])];
  const nodes = layout(nested).items.filter((i) => i.kind === "node");
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
    const a = nodes[i], b = nodes[j];
    expect(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y, `${a.id} overlaps ${b.id}`).toBe(true);
  }
});
