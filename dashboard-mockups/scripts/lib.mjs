// Shared by screens.mjs and audit.mjs. Serves ../source on a local port (the
// boards load their shared pieces at runtime, which file:// blocks) and
// borrows Playwright from the frontend's own install rather than adding one.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

export const here = dirname(fileURLToPath(import.meta.url));
export const source = join(here, "..", "source");
const require = createRequire(join(here, "..", "..", "frontend", "package.json"));
const { chromium } = require("@playwright/test");

// A machine whose preinstalled browser does not match the pinned Playwright
// can point at it with PLAYWRIGHT_CHROMIUM_EXECUTABLE.
export function launch() {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  return chromium.launch(executablePath ? { executablePath } : {});
}

const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml" };

export async function serve() {
  const server = createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^([/\\])+/, "");
    try {
      const body = await readFile(join(source, path));
      res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404); res.end();
    }
  });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  return { server, base: `http://127.0.0.1:${server.address().port}/` };
}

export async function boards(only) {
  const canvas = JSON.parse(await readFile(join(source, "canvas.json"), "utf8"));
  const names = only.length ? only : Object.keys(canvas.boards).map((n) => n.replace(".dc.html", ""));
  return names.map((n) => ({ name: n, ...canvas.boards[n + ".dc.html"] }));
}
