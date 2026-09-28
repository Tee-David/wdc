import { chromium } from "../../../frontend/node_modules/playwright/index.mjs";
import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const target = pathToFileURL(join(here, "index.html")).href;
const shots = [
  ["login", 390, 844, "login-light-390.png", false],
  ["invite", 390, 900, "invite-light-390.png", false],
  ["invite-error", 320, 780, "invite-mismatch-320.png", true],
  ["first", 390, 844, "first-google-dark-390.png", true],
  ["portal", 390, 900, "portal-settings-390.png", false],
  ["admin", 1440, 980, "admin-account-dark-1440.png", true],
  ["unlink", 390, 900, "unlink-safeguard-390.png", true],
  ["unconnected", 320, 780, "unconnected-320.png", false],
];

const installedChrome = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].find(existsSync);
const browser = await chromium.launch({ headless: true, ...(installedChrome ? { executablePath: installedChrome } : {}) });
for (const [screen, width, height, name, dark] of shots) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.goto(`${target}?screen=${screen}`);
  if (dark) await page.locator(".protoTheme").click();
  await page.screenshot({ path: join(here, name), fullPage: true });
  await page.close();
}
await browser.close();
