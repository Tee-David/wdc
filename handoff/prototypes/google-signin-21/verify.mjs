import { chromium } from "../../../frontend/node_modules/playwright/index.mjs";
import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const target = pathToFileURL(join(here, "index.html")).href;
const chrome = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].find(existsSync);
const screens = ["login", "invite", "invite-error", "first", "portal", "admin", "unlink", "unconnected"];
const sizes = [[320, 780], [390, 844], [1440, 980]];
const browser = await chromium.launch({ headless: true, ...(chrome ? { executablePath: chrome } : {}) });

for (const [width, height] of sizes) {
  const page = await browser.newPage({ viewport: { width, height } });
  for (const theme of ["light", "dark"]) {
    for (const screen of screens) {
      await page.goto(`${target}?screen=${screen}`);
      if (theme === "dark") await page.locator(".protoTheme").click();
      const result = await page.evaluate(() => {
        const visible = (node) => {
          const style = getComputedStyle(node);
          return style.display !== "none" && style.visibility !== "hidden" && node.getClientRects().length > 0;
        };
        const shortControls = [...document.querySelectorAll("button,input,select")]
          .filter(visible)
          .filter((node) => node.getBoundingClientRect().height < 44)
          .map((node) => `${node.tagName.toLowerCase()}.${node.className}:${node.getBoundingClientRect().height.toFixed(1)}`);
        return { overflow: document.documentElement.scrollWidth - innerWidth, shortControls };
      });
      if (result.overflow > 0 || result.shortControls.length) {
        throw new Error(`${screen} ${theme} ${width}px failed: ${JSON.stringify(result)}`);
      }
    }
  }
  await page.close();
}

await browser.close();
console.log(`Verified ${screens.length * sizes.length * 2} responsive theme states: no horizontal overflow and all visible controls are at least 44px tall.`);
