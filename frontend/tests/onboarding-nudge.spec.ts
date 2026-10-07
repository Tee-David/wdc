import { expect, test } from "@playwright/test";

/**
 * The one tap link at the foot of a reminder fails closed. A real signed link
 * needs the server's secret, so what can be checked from outside is that
 * nothing unsigned, incomplete or aimed at a made up draft switches anything
 * off, and that the answer is a small plain page and not JSON.
 */
test("a missing, empty or forged link is refused with a plain page", async ({ request }) => {
  for (const query of ["", "?d=&t=", "?d=00000000-0000-0000-0000-000000000000&t=forged", "?d=not-an-id&t=x"]) {
    const res = await request.get(`/api/onboarding/nudges-off${query}`);
    expect(res.status(), query).toBe(400);
    expect(res.headers()["content-type"]).toContain("text/html");
    expect(await res.text()).toContain("That link did not work");
    expect(res.headers()["cache-control"]).toContain("no-store");
  }
});
