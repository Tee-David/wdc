import { expect, test } from "@playwright/test";
import {
  MEETING_ERROR_CODES, bookingBlockers, codeForCalStatus, describeMeetingError, loadFailureCode, meetingErrorCode,
  meetingsStatusLabel, plainMeetingMessage,
} from "../lib/meetings/errors";
import { scheduleProblem } from "../lib/meetings/schedule-check";

/**
 * Settings, Meetings: what the owner is told when it is not working.
 * Pure logic only (no Cal.com account and no database here); every code must
 * explain itself and offer a next step, and the visitor-facing text must never
 * name a key.
 */

test("every error code says what is wrong and offers a next action", () => {
  for (const code of MEETING_ERROR_CODES) {
    const info = describeMeetingError(code);
    expect(info.title.length, code).toBeGreaterThan(8);
    expect(info.message.length, code).toBeGreaterThan(30);
    expect(info.actions.length, code).toBeGreaterThan(0);
    // A visitor is never shown an env var or an admin path.
    expect(info.plain, code).not.toMatch(/CAL_|Settings|migration|\/admin/i);
  }
});

test("a missing key names the variable and links to Integrations", () => {
  const info = describeMeetingError("no_api_key");
  expect(info.message).toContain("CAL_API_KEY");
  expect(info.actions).toContainEqual({ kind: "link", label: "Open Settings › Integrations", href: "/admin/settings/integrations" });
});

test("a missing migration names it and links to System", () => {
  const info = describeMeetingError("migration_missing");
  expect(info.message).toContain("0035_meetings");
  expect(info.actions.some((a) => a.kind === "link" && a.href === "/admin/settings/system")).toBe(true);
});

test("Cal.com refusing, timing out and being busy are different messages with Retry where it helps", () => {
  const refused = describeMeetingError("cal_rejected"), timeout = describeMeetingError("cal_timeout"), busy = describeMeetingError("cal_busy");
  expect(new Set([refused.message, timeout.message, busy.message]).size).toBe(3);
  expect(refused.message).toMatch(/refused/i);
  expect(timeout.message).toMatch(/did not answer/i);
  expect(timeout.actions.some((a) => a.kind === "retry")).toBe(true);
  expect(busy.actions.some((a) => a.kind === "retry")).toBe(true);
});

test("setup not run offers Set up now", () => {
  expect(describeMeetingError("setup_missing").actions).toEqual([{ kind: "setup", label: "Set up now" }]);
});

test("an unrecognised code is never blank", () => {
  expect(describeMeetingError("something-new").title).toBe(describeMeetingError("unknown").title);
  expect(describeMeetingError(undefined).actions.length).toBeGreaterThan(0);
});

test("Cal.com statuses map to codes", () => {
  expect(codeForCalStatus(401)).toBe("cal_rejected");
  expect(codeForCalStatus(403)).toBe("cal_rejected");
  expect(codeForCalStatus(429)).toBe("cal_busy");
  expect(codeForCalStatus(500)).toBe("cal_error");
  expect(codeForCalStatus(404)).toBe("cal_error");
});

test("the code an error carries is read without importing server code", () => {
  expect(meetingErrorCode({ meetingCode: "cal_timeout" })).toBe("cal_timeout");
  expect(meetingErrorCode({ meetingCode: "made-up" })).toBe("unknown");
  expect(meetingErrorCode(new Error("boom"))).toBe("unknown");
  expect(meetingErrorCode(null)).toBe("unknown");
  expect(plainMeetingMessage("cal_busy")).toBe("Scheduling is busy. Please try again shortly.");
});

test("browser failures map to timeout, unreadable reply or offline", () => {
  expect(loadFailureCode(Object.assign(new Error("t"), { name: "TimeoutError" }))).toBe("request_timeout");
  expect(loadFailureCode(new SyntaxError("Unexpected token <"))).toBe("bad_reply");
  expect(loadFailureCode(new TypeError("Failed to fetch"))).toBe("offline");
  expect(loadFailureCode(new Error("x"))).toBe("unknown");
});

test("the Settings card status comes from stored config alone", () => {
  const set = { event_type_id: 7, enabled: false };
  expect(meetingsStatusLabel({ hasKey: false, config: set })).toBe("Not set up");
  expect(meetingsStatusLabel({ hasKey: true, config: null })).toBe("Not set up");
  expect(meetingsStatusLabel({ hasKey: true, config: { event_type_id: null, enabled: false } })).toBe("Not set up");
  expect(meetingsStatusLabel({ hasKey: true, config: set })).toBe("Off");
  expect(meetingsStatusLabel({ hasKey: true, config: { ...set, enabled: true } })).toBe("Taking bookings");
});

const ready = { hasEventType: true, calendar: true, meet: true, webhook: "ready" as const, webhookAck: false };

test("the booking switch lists every reason it is off, each with its fix", () => {
  expect(bookingBlockers(ready)).toEqual([]);
  const none = bookingBlockers({ hasEventType: false, calendar: false, meet: false, webhook: "not_registered", webhookAck: false });
  expect(none.map((b) => b.id)).toEqual(["setup", "calendar", "meet", "webhook"]);
  for (const b of none) {
    expect(b.reason.length).toBeGreaterThan(10);
    expect(b.fix.length).toBeGreaterThan(3);
  }
});

test("an unconfirmed webhook can be acknowledged; a missing or mismatched one cannot", () => {
  expect(bookingBlockers({ ...ready, webhook: "unconfirmed" }).map((b) => b.id)).toEqual(["webhook"]);
  expect(bookingBlockers({ ...ready, webhook: "unconfirmed", webhookAck: true })).toEqual([]);
  for (const webhook of ["no_secret", "not_registered", "secret_mismatch"] as const) {
    expect(bookingBlockers({ ...ready, webhook, webhookAck: true }).map((b) => b.id), webhook).toEqual(["webhook"]);
  }
  expect(bookingBlockers({ ...ready, webhook: "no_secret" })[0].reason).toContain("CAL_WEBHOOK_SECRET");
});

test("a schedule problem names the day or date", () => {
  const day = (days: string[], startTime: string, endTime: string) => ({ days, startTime, endTime });
  expect(scheduleProblem({ availability: [day(["Monday"], "09:00", "12:00"), day(["Tuesday"], "09:00", "17:00")], overrides: [] })).toBeNull();
  expect(scheduleProblem({ availability: [day(["Monday"], "09:00", "17:00"), day(["Monday"], "09:00", "17:00")], overrides: [] })).toMatch(/^Monday has two ranges that overlap/);
  expect(scheduleProblem({ availability: [day(["Friday"], "17:00", "09:00")], overrides: [] })).toMatch(/^Friday: a range ends at 09:00/);
  expect(scheduleProblem({ availability: [], overrides: [{ date: "2026-12-25", startTime: "09:00", endTime: "10:00" }, { date: "2026-12-25", startTime: "09:30", endTime: "11:00" }] })).toContain("2026-12-25");
  // Touching ranges are fine.
  expect(scheduleProblem({ availability: [day(["Monday"], "09:00", "12:00"), day(["Monday"], "12:00", "17:00")], overrides: [] })).toBeNull();
});
