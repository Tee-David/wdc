/**
 * THE HERO TILE ICONS: tiny looping GIFs, one per Lucide shape in shapes.mjs.
 *
 *   node scripts/email-icons/tiles.mjs [names...]
 *
 * The base shape stays still and the accent part moves. Frame 1 is the whole
 * icon at rest, because Outlook on Windows shows only the first frame. 64 px,
 * shown at 32 px in a white 52 px tile (lib/email-templates.ts `hero`).
 * Written to public/email/tile-<name>.gif.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { ICON_SHAPES } from "./shapes.mjs";

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../public/email");
const [BG, BASE, ACCENT] = ["#ffffff", "#000065", "#ff6500"];
const only = process.argv.slice(2);

// Motion per icon: a function of t (0..1 across the moving part) returning an SVG transform for the accent.
const ease = (t) => 0.5 - 0.5 * Math.cos(Math.PI * 2 * t); // 0 -> 1 -> 0, smooth
const wiggle = (cx, cy, deg) => (t) => `rotate(${(Math.sin(t * Math.PI * 4) * deg * (1 - t)).toFixed(2)} ${cx} ${cy})`;
const nudge = (dx, dy) => (t) => `translate(${(dx * ease(t)).toFixed(2)} ${(dy * ease(t)).toFixed(2)})`;
const pop = (cx, cy, s = 0.16) => (t) => { const k = 1 + s * Math.sin(Math.PI * t) * (t < 0.5 ? 1 : 0.6); return `translate(${cx} ${cy}) scale(${k.toFixed(3)}) translate(${-cx} ${-cy})`; };
const sweep = (cx, cy, deg) => (t) => `rotate(${(-deg * ease(t)).toFixed(2)} ${cx} ${cy})`;
const MOTION = {
  bell: { whole: true, fn: wiggle(12, 3, 14) },
  alert: { fn: pop(12, 13, 0.25) },
  send: { whole: true, fn: nudge(2.2, -2.2) },
  reply: { fn: nudge(-2, 0) },
  undo: { fn: nudge(-2, 0) },
  "arrow-right": { fn: nudge(2.5, 0) },
  "log-in": { fn: nudge(2, 0) },
  download: { fn: nudge(0, 2) },
  gauge: { fn: sweep(12, 14, 70) },
  flask: { fn: pop(12, 16, 0.12) },
  layers: { fn: nudge(0, -1.6) },
  eye: { fn: pop(12, 12, 0.3) },
  globe: { fn: pop(12, 12, 0.08) },
  "check-circle": { fn: pop(12, 12, 0.28) },
  "x-circle": { fn: pop(12, 12, 0.28) },
  "mail-check": { fn: pop(19, 19, 0.3) },
  "user-plus": { fn: pop(19, 11, 0.35) },
  users: { fn: nudge(1, 0) },
  shield: { fn: pop(12, 12, 0.3) },
  key: { fn: sweep(11.4, 11.6, 18) },
  lock: { fn: nudge(0, -1.6) },
  list: { fn: pop(6, 12, 0.18) },
  "file-text": { fn: nudge(0.8, 0) },
  receipt: { fn: pop(12, 12, 0.2) },
  clipboard: { fn: nudge(0.8, 0) },
  message: { fn: nudge(0.8, 0) },
  inbox: { fn: nudge(0, 1.2) },
  calendar: { fn: nudge(0, -1.2) },
  phone: { fn: pop(12, 18, 0.9) },
  check: { whole: true, fn: pop(12, 12, 0.14) },
  "credit-card": { fn: nudge(0, 0.8) },
  wrench: { whole: true, fn: wiggle(12, 12, 10) },
};

const SIZE = 64;          // 2x of a 32 px box (a 26 px icon with room to move)
const MOVE = 24;          // frames of motion
const DELAY = 50;         // ms per motion frame (1.2 s of motion)
const HOLD = 1400;        // ms resting on the complete icon before the loop restarts

function svg(name, transform) {
  const [base, ...accent] = ICON_SHAPES[name];
  const m = MOTION[name] || { fn: pop(12, 12, 0.15) };
  const baseG = `<g stroke="${BASE}" ${m.whole && transform ? `transform="${transform}"` : ""}>${base}</g>`;
  const accG = accent.length ? `<g stroke="${ACCENT}" ${transform ? `transform="${transform}"` : ""}>${accent.join("")}</g>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="-3 -3 30 30" fill="none" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="-4" y="-4" width="32" height="32" fill="${BG}"/>${baseG}${accG}</svg>`;
}

const names = only.length ? only : Object.keys(ICON_SHAPES);
let total = 0;
for (const name of names) {
  if (!ICON_SHAPES[name]) { console.log(`skip ${name}: no shape`); continue; }
  const fn = (MOTION[name] || { fn: pop(12, 12, 0.15) }).fn;
  const frames = [svg(name, "")];                                  // frame 1: the complete icon at rest
  for (let i = 1; i <= MOVE; i++) frames.push(svg(name, fn(i / MOVE)));
  const bufs = await Promise.all(frames.map((s) => sharp(Buffer.from(s), { density: 288 }).resize(SIZE, SIZE).flatten({ background: BG }).png().toBuffer()));
  const delays = [HOLD, ...Array(MOVE).fill(DELAY)];
  const out = path.join(outDir, `tile-${name}.gif`);
  await sharp(bufs, { join: { animated: true } }).gif({ delay: delays, loop: 0, colours: 32, dither: 0, effort: 10 }).toFile(out);
  const kb = fs.statSync(out).size / 1024; total += kb;
  console.log(`${name.padEnd(13)} ${kb.toFixed(1)} KB`);
}
console.log(`total ${total.toFixed(0)} KB for ${names.length} icons`);
