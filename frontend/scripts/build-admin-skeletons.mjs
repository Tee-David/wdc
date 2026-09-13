import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const chromeCandidates = process.platform === "win32"
  ? [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      join(process.env.LOCALAPPDATA ?? "", "Google", "Chrome", "Application", "chrome.exe"),
    ]
  : process.platform === "darwin"
    ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]
    : ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium"];
const chromePath = chromeCandidates.find((candidate) => candidate && existsSync(candidate));

if (!chromePath) {
  throw new Error("Google Chrome is required to rebuild the admin skeletons.");
}

const appPort = await freePort();
const cdpPort = await freePort();
const captureToken = randomBytes(32).toString("hex");
const profileDir = mkdtempSync(join(tmpdir(), "wdc-boneyard-"));
const children = [];

try {
  const chrome = launch(chromePath, [
    "--headless=new",
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${profileDir}`,
    "--no-first-run",
    "--disable-default-apps",
    "about:blank",
  ]);
  children.push(chrome);

  const next = launch(process.execPath, [
    join(root, "node_modules", "next", "dist", "bin", "next"),
    "dev",
    "--port",
    String(appPort),
  ], { BONEYARD_CAPTURE_TOKEN: captureToken });
  children.push(next);

  await Promise.all([
    waitFor(`http://localhost:${cdpPort}/json/version`),
    waitFor(`http://localhost:${appPort}/admin`, {
      "x-boneyard-capture": captureToken,
    }),
  ]);

  const cli = launch(process.execPath, [
    join(root, "node_modules", "boneyard-js", "bin", "cli.js"),
    "build",
    `http://localhost:${appPort}/admin`,
    "--force",
    "--no-scan",
    "--cdp",
    String(cdpPort),
  ], { BONEYARD_CAPTURE_TOKEN: captureToken });

  const exitCode = await new Promise((resolve) => cli.once("exit", resolve));
  if (exitCode !== 0) process.exitCode = exitCode ?? 1;
} finally {
  await Promise.allSettled(children.reverse().map(stopProcessTree));
  await new Promise((resolve) => setTimeout(resolve, 2_000));
  const tempRoot = tmpdir().toLowerCase();
  if (profileDir.toLowerCase().startsWith(tempRoot) && profileDir.includes("wdc-boneyard-")) {
    try {
      rmSync(profileDir, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
    } catch (error) {
      console.warn(`Could not remove temporary Chrome profile: ${error.message}`);
    }
  }
}

function launch(command, args, extraEnv = {}) {
  return spawn(command, args, {
    cwd: root,
    env: { ...process.env, ...extraEnv },
    stdio: "inherit",
    windowsHide: true,
  });
}

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function stopProcessTree(child) {
  if (!child.pid || child.exitCode !== null) return;
  if (process.platform === "win32") {
    const killer = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    await new Promise((resolve) => killer.once("exit", resolve));
    return;
  }
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);
}

async function waitFor(url, headers) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { headers, redirect: "manual" });
      if (response.status < 500) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Timed out waiting for ${new URL(url).origin}`);
}
