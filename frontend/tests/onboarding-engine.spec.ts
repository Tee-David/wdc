import { expect, test } from "@playwright/test";
import { isQuestion, isUnsure, isVisible, minutesLeft, problemWith, UNSURE, UNSURE_LEGACY, type Field } from "../lib/onboarding";

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
