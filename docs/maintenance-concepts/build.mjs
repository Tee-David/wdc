// Inlines the shared shell into each concept so every page is one standalone file.
// Usage: node build.mjs   (reads src/*.html, writes dist/*.html)
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
const here = new URL(".", import.meta.url).pathname;
const read = (p) => readFileSync(here + p, "utf8");
const mark = read("shared/mark.b64").trim();
const parts = {
  "<!--@head-->": read("shared/head.html"),
  "<!--@dock-->": read("shared/dock.html").replace("@@MARK@@", mark),
  "<!--@js-->": read("shared/dock.js"),
};
mkdirSync(here + "dist", { recursive: true });
for (const f of readdirSync(here + "src").filter((f) => f.endsWith(".html"))) {
  let html = read("src/" + f);
  for (const [k, v] of Object.entries(parts)) html = html.split(k).join(v);
  html = html.split("@@MARK@@").join(mark);
  writeFileSync(here + "dist/" + f, html);
  console.log("built", f, Math.round(html.length / 1024) + "KB");
}
