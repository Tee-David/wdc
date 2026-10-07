import { expect, test } from "@playwright/test";
import { scopeNote } from "../lib/onboarding-scope";
import { engagementFor, engagementIsLive, engagementNameProblem, LAWYER_APPROVED } from "../lib/onboarding-engagement";
import { SERVICES } from "../lib/services";
import { UNSURE } from "../lib/onboarding";

test("the studio note is read straight off the answers and invents nothing", () => {
  const note = scopeNote("web", {
    site_size: "A bigger site", site_jobs: ["Sell online"], pay_providers: ["Paystack"],
    site_new_or_existing: "Improving an existing site", deadline_kind: "Within two weeks", page_count: UNSURE,
  });
  expect(note.size).toEqual({ said: "A bigger site", tier: 2 });
  expect(note.signals.find((s) => s.label === "Payment providers")?.value).toBe("Paystack");
  expect(note.watch.join(" ")).toMatch(/within two weeks/i);
  expect(note.watch.join(" ")).toMatch(/Takes payments/);
  expect(note.watch.join(" ")).toMatch(/1 answer was "not sure"/);
  /* An empty brief says nothing rather than something. */
  const empty = scopeNote("apps", {});
  expect(empty).toEqual({ size: { said: "", tier: 1 }, signals: [], watch: [] });
});

test("branding notes name motion work and a missing identity", () => {
  const note = scopeNote("branding", {
    job_size: "Several pieces", deliverables: ["Flyers", "Motion design"], motion_kinds: ["Social reel"], brand_have: ["Nothing yet"],
  });
  expect(note.watch.join(" ")).toMatch(/Motion design asked for: Social reel/);
  expect(note.watch.join(" ")).toMatch(/No identity to build from/);
});

test("engagement is four grouped ticks per service, plain words, and off until a lawyer approves", () => {
  expect(LAWYER_APPROVED).toBe(false);
  expect(engagementIsLive({ ONBOARDING_ENGAGEMENT: "on" })).toBe(false);
  for (const s of SERVICES) {
    const groups = engagementFor(s.slug);
    expect(groups.map((g) => g.id)).toEqual(["work", "money", "limits", "ending"]);
    for (const g of groups) {
      for (const t of [g.title, g.summary, ...g.body]) {
        expect(t, t).not.toMatch(/[–—]|\s-\s/);
        expect(t, t).not.toMatch(/;/);
        expect(t, t).not.toMatch(/\b(Lagos|Lekki|Abuja|Nairobi|Dubai|Accra)\b/);
      }
    }
  }
  /* Service terms really are different. */
  expect(engagementFor("seo")[0].body.join(" ")).toMatch(/three months/);
  expect(engagementFor("social")[1].body.join(" ")).toMatch(/Ad spend is paid to the platform/);
  expect(engagementFor("apps")[2].body.join(" ")).toMatch(/app store review/i);
});

test("accepting needs a first and last name", () => {
  expect(engagementNameProblem("Ada")).not.toBeNull();
  expect(engagementNameProblem("Ada Obi")).toBeNull();
  expect(engagementNameProblem(undefined)).not.toBeNull();
});
