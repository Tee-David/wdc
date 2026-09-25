// Checks every board for the faults the mockups were held to: single-line
// controls that wrap or overflow, children sticking out of a boxed container,
// and overlays placed off the board. Exits non-zero when anything is found.
//   node dashboard-mockups/scripts/audit.mjs [Board ...]
import { boards, launch, serve } from "./lib.mjs";

const { server, base } = await serve();
const browser = await launch();
const ctx = await browser.newContext();
const report = {};
const list = await boards(process.argv.slice(2));
for (const b of list) {
  const p = await ctx.newPage();
  await p.setViewportSize({ width: b.w, height: b.h });
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(base + b.name + ".dc.html");
  await p.waitForTimeout(1500);
    const issues = await p.evaluate(() => {
      const out = [];
      const txt = el => (el.innerText || "").replace(/\s+/g, " ").trim().slice(0, 36);
      const clipped = el => { for (let a = el.parentElement; a; a = a.parentElement) { if (a.classList.contains("hscroll") || a.classList.contains("trunc")) return true; } return false; };
      // 1. single-line controls that wrap or overflow
      document.querySelectorAll(".btn,.pill,.chip,.tag,.menu .mi,.pg a,.pp,.tabs a,.seg button,.seg a,.kbd,.inp:not(.ta),.nav a").forEach(el => {
        if (clipped(el)) return;
        const r = el.getBoundingClientRect(); if (!r.width) return;
        if (el.scrollWidth > el.clientWidth + 1 && !el.matches(".inp")) out.push(`overflow-x ${el.className.split(" ")[0]} "${txt(el)}"`);
        const cs = getComputedStyle(el); const lh = parseFloat(cs.fontSize) * 1.9 + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
        if (r.height > Math.max(lh, parseFloat(cs.height) || 0) + 2 && !el.matches(".menu .mi")) out.push(`wraps ${el.className.split(" ")[0]} "${txt(el)}" h=${Math.round(r.height)}`);
      });
      // 2. children sticking out of boxed containers
      const boxes = ".card,.kcard,.attn,.dlg,.drawer,.sheet,.menu,.pop,.choice,.lrow,.mcard-row,.toolbar,.pager,.m-pager,.kcol,.tourcard,.side-in,.top,.m-top";
      document.querySelectorAll(boxes).forEach(box => {
        if (clipped(box)) return;
        const br = box.getBoundingClientRect(); if (!br.width) return;
        box.querySelectorAll("*").forEach(ch => {
          if (clipped(ch) || ch.closest(".hscroll")) return;
          const cs = getComputedStyle(ch); if (cs.position === "absolute" || cs.position === "fixed") return;
          if (ch.closest(boxes) !== box) return;
          const r = ch.getBoundingClientRect(); if (!r.width || !r.height) return;
          if (r.right > br.right + 1.5 || r.left < br.left - 1.5) out.push(`sticks-out ${(ch.className||ch.tagName)+""}`.slice(0,60) + ` "${txt(ch)}" in ${box.className.split(" ")[0]} by ${Math.round(Math.max(r.right - br.right, br.left - r.left))}px`);
        });
      });
      // 3. overlays outside the artboard
      const root = document.querySelector(".root, .m"); const rr = root && root.getBoundingClientRect();
      if (rr) document.querySelectorAll(".menu,.pop,.dlg,.drawer,.sheet,.tip,.toast").forEach(o => { const r = o.getBoundingClientRect(); if (r.width && (r.right > rr.right + 1 || r.bottom > rr.bottom + 1 || r.left < rr.left - 1)) out.push(`off-board ${o.className.split(" ")[0]} "${txt(o)}"`); });
      return [...new Set(out)].slice(0, 25);
    });
  if (issues.length || errs.length) report[b.name] = { issues, errs: errs.slice(0, 2) };
  await p.close();
}
await browser.close();
server.close();
console.log(JSON.stringify(report, null, 1));
console.log("boards", list.length, "with issues", Object.keys(report).length);
process.exit(Object.keys(report).length ? 1 : 0);
