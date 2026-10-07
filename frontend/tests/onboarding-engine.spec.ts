import { expect, test } from "@playwright/test";
import { isQuestion, isUnsure, isVisible, minutesLeft, problemWith, tierOf, UNSURE, UNSURE_LEGACY, type Field } from "../lib/onboarding";

/**
 * The visibility rule is the one thing the form, the server check and the admin
 * views all lean on. These pin it without a browser.
 */
const f = (showIf: Field["showIf"]): Field => ({ key: "q", label: "Q", kind: "text", showIf });

test("a question with no condition is always asked", () => {
  expect(isVisible(f(undefined), {})).toBe(true);
});

test("equals matches a string answer or any item of a list", () => {
  const field = f({ key: "a", equals: ["Yes", "Maybe"] });
  expect(isVisible(field, { a: "Yes" })).toBe(true);
  expect(isVisible(field, { a: ["No", "Maybe"] })).toBe(true);
  expect(isVisible(field, { a: "No" })).toBe(false);
  expect(isVisible(field, {})).toBe(false);
});

test("filled matches any answer, and a list of conditions needs all of them", () => {
  const field = f([{ key: "size", equals: ["Medium", "Large"] }, { key: "a", filled: true }]);
  expect(isVisible(field, { size: "Large", a: "x" })).toBe(true);
  expect(isVisible(field, { size: "Small", a: "x" })).toBe(false);
  expect(isVisible(field, { size: "Large", a: "  " })).toBe(false);
  expect(isVisible(f({ key: "a", filled: false }), {})).toBe(true);
});

test("both spellings of not sure read as not sure, and the new one is the comma", () => {
  expect(UNSURE).toBe("I'm not sure, please advise me");
  expect(isUnsure(UNSURE)).toBe(true);
  expect(isUnsure(UNSURE_LEGACY)).toBe(true);
  expect(isUnsure("Yes")).toBe(false);
  const required: Field = { key: "e", label: "Email", kind: "email", required: true };
  expect(problemWith(required, UNSURE_LEGACY)).toBeNull();
});

test("a notice asks nothing, is never required and costs no time", () => {
  const notice: Field = { key: "n", label: "Before we start", kind: "notice", hint: "We do not build games.", required: true };
  expect(isQuestion(notice)).toBe(false);
  expect(problemWith(notice, undefined)).toBeNull();
  const steps = [{ id: "s", title: "S", blurb: "", phase: "work" as const, fields: [notice] }];
  expect(minutesLeft(steps, 0, {}, () => true)).toBe(1);
});

test("the tier comes from the size answer, and not sure counts as the middle", () => {
  expect(tierOf({})).toBe(1);
  expect(tierOf({ site_size: "A simple site" })).toBe(1);
  expect(tierOf({ site_size: "A bigger site" })).toBe(2);
  expect(tierOf({ job_size: "A full brand" })).toBe(3);
  expect(tierOf({ app_size: "Large" })).toBe(3);
  expect(tierOf({ seo_size: UNSURE })).toBe(2);
  expect(tierOf({ sw_size: UNSURE_LEGACY })).toBe(2);
});

test("a tier condition holds at or above it, and any-of lets a later pick raise the tier", () => {
  const medium = f({ tier: 2 });
  expect(isVisible(medium, { job_size: "One piece or a small set" })).toBe(false);
  expect(isVisible(medium, { job_size: "Several pieces" })).toBe(true);
  expect(isVisible(medium, {})).toBe(false);

  const colours = f({ any: [{ tier: 2 }, { key: "deliverables", equals: ["Brand guidelines", "Full identity system"] }] });
  expect(isVisible(colours, { job_size: "One piece or a small set" })).toBe(false);
  expect(isVisible(colours, { job_size: "One piece or a small set", deliverables: ["Logo", "Brand guidelines"] })).toBe(true);
  expect(isVisible(colours, { job_size: "A full brand" })).toBe(true);
});
