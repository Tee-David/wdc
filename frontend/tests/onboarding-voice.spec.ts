import { expect, test } from "@playwright/test";
import { echoFor, exampleFor, fill, joinNames, milestone, nextLabel } from "../lib/onboarding-voice";

test("copy is filled from answers and never shows a raw placeholder", () => {
  expect(fill("Now, {first_name}, about {company}", { first_name: "Ada", company: "Moore Designs" })).toBe("Now, Ada, about Moore Designs");
  expect(fill("About {company|your business}", {})).toBe("About your business");
  expect(fill("Hello {first_name}.", {})).toBe("Hello.");
  expect(fill("Nothing to fill here", { first_name: "Ada" })).toBe("Nothing to fill here");
});

test("examples come from the industry and fall back to a neutral one", () => {
  expect(exampleFor("job", { industry: "Food and drink" })).toMatch(/cakes/);
  expect(exampleFor("job", { industry: "Something unlisted" })).toBe(exampleFor("job", {}));
  for (const kind of ["job", "terms", "goal", "success", "pains"] as const) {
    const t = exampleFor(kind, { industry: "Health and wellness" });
    expect(t).not.toMatch(/[–—;]|\s-\s/);
  }
});

test("the reflect back line is built from picks only", () => {
  expect(echoFor("branding", { deliverables: ["Logo", "Flyers"] })).toBe("logo and flyers. A good place to start.");
  expect(echoFor("branding", { deliverables: ["Other"] })).toBeNull();
  expect(echoFor("branding", {})).toBeNull();
  expect(echoFor("you", { first_name: "Ada" })).toBe("Good to meet you, Ada.");
  expect(echoFor("social", { social_packages: ["Management", "Paid ads"] })).toBe("management and paid ads. We have it.");
  expect(joinNames(["a", "b", "c"])).toBe("a, b and c");
});

test("milestones appear at the middle and the end, not on every screen", () => {
  const lines = Array.from({ length: 8 }, (_, i) => milestone(i, 8));
  expect(lines.filter(Boolean).length).toBeLessThanOrEqual(4);
  expect(lines[3]).toBe("Halfway. The hard part is done.");
  expect(lines[7]).toBe("Last one. Then you review and send.");
  expect(milestone(0, 3)).toBeNull();
});

test("the button names the next screen", () => {
  expect(nextLabel("Your business")).toBe("Next: your business");
  expect(nextLabel(undefined)).toBe("Review and send");
});
