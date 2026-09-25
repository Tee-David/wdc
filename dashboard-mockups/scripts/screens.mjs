// Regenerates screens/<Board>.png from source/. Usage:
//   node dashboard-mockups/scripts/screens.mjs            every board
//   node dashboard-mockups/scripts/screens.mjs MTabs Main just these
import { join } from "node:path";
import { boards, launch, here, serve } from "./lib.mjs";

const { server, base } = await serve();
const browser = await launch();
const ctx = await browser.newContext();
for (const b of await boards(process.argv.slice(2))) {
  const page = await ctx.newPage();
  await page.setViewportSize({ width: b.w, height: b.h });
  await page.goto(base + b.name + ".dc.html");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(here, "..", "screens", b.name + ".png") });
  await page.close();
  console.log(b.name);
}
await browser.close();
server.close();
