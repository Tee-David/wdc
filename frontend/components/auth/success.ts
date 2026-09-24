import type { Stage } from "@/components/auth/stage/stage-store";

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
const EMPHASIZED = "cubic-bezier(.76,0,.24,1)";
const NAVY = "#000065";

/* Routes that are still on the way in: the cover must not lift over them. */
const IN_BETWEEN = new Set(["/login", "/signed-in"]);
/** A status line appears if the dashboard is not there by now... */
const SAY_OPENING_MS = 2500;
/** ...a plainer one if it is taking a while... */
const SAY_SLOW_MS = 7000;
/** ...and past this the client-side navigation is abandoned for a real page load. */
const HARD_RELOAD_MS = 12000;
/** A destination without the dashboard shell (`.ad`) lifts this long after arriving. */
const SETTLE_MS = 1200;

/**
 * THE DOOR OPENS FROM THE ORB, AND THE WAY THROUGH IS NEVER BLANK.
 *
 *   0ms     the ring closes; the orb floods (see SUCCESS_STYLE in orb-stage)
 *   440ms   a navy circle grows from the orb until it covers the screen
 *   ~700ms  the WDC lockup and a moving bar settle in the middle of it
 *   1090ms  navigate, underneath; the dashboard was prefetched at 0ms
 *   then    lift, once the dashboard's own shell is on screen
 *
 * WHY THIS AND NOT A PLAIN NAVY CURTAIN. The old curtain lifted the moment
 * the address left /login, which was usually /signed-in on its way to the
 * dashboard, so the reader saw a white page between the two; and while the
 * dashboard loaded the curtain was a flat navy screen with nothing moving,
 * which on a slow connection looks like the page has hung. Now the curtain
 * is the preloader: the lockup and a bar that never stops moving, a line of
 * text if it takes more than a moment, and a real page load if the
 * client-side navigation has not landed in twelve seconds.
 *
 * EVERY STYLE IS INLINE OR IN THE CURTAIN'S OWN <style>. The curtain outlives
 * this page, and the login stylesheet is not guaranteed to outlive the route
 * change; a curtain styled by it could turn transparent mid-navigation.
 *
 * Reduced motion: no flood and no circle, a 200ms fade to navy, and the bar
 * pulses in place instead of travelling.
 */
export async function playSuccess({
  stage,
  destination,
  navigate,
  demo,
  hold,
}: {
  stage: Stage;
  destination: string;
  navigate: (href: string) => void;
  demo: boolean;
  /** Something on the card still finishing (the code's tick); the circle waits for it. */
  hold?: Promise<void>;
}) {
  const reduced = stage.reduced;
  await stage.ringEnd(true);
  if (!reduced) stage.celebrate();
  await Promise.all([sleep(reduced ? 0 : 440), hold]);

  const centre = stage.orbCentre() ?? { x: window.innerWidth / 2, y: window.innerHeight / 2, r: 60 };
  const cover = buildCover(centre, reduced);
  document.body.appendChild(cover.root);

  if (reduced) {
    await cover.root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: "forwards" }).finished.catch(() => {});
  } else {
    const r1 = Math.hypot(Math.max(centre.x, window.innerWidth - centre.x), Math.max(centre.y, window.innerHeight - centre.y));
    await cover.root
      .animate(
        [{ clipPath: `circle(${centre.r}px at ${centre.x}px ${centre.y}px)` }, { clipPath: `circle(${r1 + 2}px at ${centre.x}px ${centre.y}px)` }],
        { duration: 650, easing: EMPHASIZED, fill: "forwards" },
      )
      .finished.catch(() => {});
  }
  cover.root.style.clipPath = "none";

  if (demo) {
    /* Long enough to see the loader it would be, then the card that says so. */
    await sleep(1400);
    demoCurtain(cover);
    return;
  }

  navigate(destination);

  const started = performance.now();
  let arrivedAt = 0;
  let reloading = false;
  const watch = window.setInterval(() => {
    const now = performance.now();
    const path = window.location.pathname;
    if (!IN_BETWEEN.has(path)) {
      arrivedAt ||= now;
      if (document.querySelector(".ad") || now - arrivedAt > SETTLE_MS) {
        window.clearInterval(watch);
        cover.lift();
        return;
      }
    }
    const waited = now - started;
    if (waited > HARD_RELOAD_MS && !reloading) {
      reloading = true;
      cover.say("Reloading to finish signing you in…");
      window.location.assign(destination);
    } else if (waited > SAY_SLOW_MS && !reloading) {
      cover.say("Still on its way. Your connection seems slow.");
    } else if (waited > SAY_OPENING_MS && !reloading) {
      cover.say("Opening your dashboard…");
    }
  }, 100);
}

/* ------------------------------------------------------------------ cover */

const CSS = `
.auz{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;
  background:${NAVY};
  color:#fff;font-family:var(--font-space-grotesk),system-ui,-apple-system,"Segoe UI",sans-serif}
.auz__in{display:grid;justify-items:center;gap:22px;opacity:0;transform:translateY(8px) scale(.94);
  animation:auz-in .45s cubic-bezier(.2,.8,.2,1) .25s forwards}
.auz__lockup{display:flex;align-items:center;gap:12px}
.auz__lockup img{display:block;width:46px;height:48px}
.auz__word{display:grid;font-weight:700;font-size:22px;line-height:.98;letter-spacing:-.01em}
.auz__bar{position:relative;width:148px;height:3px;border-radius:3px;overflow:hidden;background:rgb(255 255 255 / .16)}
.auz__bar i{position:absolute;inset:0 auto 0 0;width:42%;border-radius:3px;background:#ff6500;
  animation:auz-run 1.05s cubic-bezier(.65,0,.35,1) infinite}
.auz__say{min-height:1.4em;margin:0;color:rgb(255 255 255 / .74);font:400 14px/1.4 var(--font-body,var(--font-space-grotesk)),system-ui,sans-serif;text-align:center}
.auz--out .auz__in{animation:auz-out .26s ease forwards}
@keyframes auz-in{to{opacity:1;transform:none}}
@keyframes auz-out{from{opacity:1;transform:none}to{opacity:0;transform:scale(1.04)}}
@keyframes auz-run{0%{transform:translateX(-105%)}100%{transform:translateX(245%)}}
@keyframes auz-pulse{50%{opacity:.35}}
.auz--still .auz__in{animation:none;opacity:1;transform:none}
.auz--still .auz__bar i{width:100%;animation:auz-pulse 1.4s ease-in-out infinite}
.auz--demo .auz__in{display:none}
.auz__card{--btn-fill:#fff;--btn-ink:#000;display:grid;gap:12px;max-width:360px;padding:24px;text-align:center;font:400 16px/1.5 var(--font-body,var(--font-space-grotesk)),system-ui,sans-serif}
.auz__card p{margin:0}
.auz__title{font:600 34px/1.1 var(--font-space-grotesk),system-ui,sans-serif;letter-spacing:-.02em}
.auz__card .au-btn{margin-top:12px}
`;

function buildCover(centre: { x: number; y: number; r: number }, reduced: boolean) {
  const root = document.createElement("div");
  root.className = `auz${reduced ? " auz--still" : ""}`;
  if (!reduced) root.style.clipPath = `circle(${centre.r}px at ${centre.x}px ${centre.y}px)`;

  const style = document.createElement("style");
  style.textContent = CSS;

  const inner = document.createElement("div");
  inner.className = "auz__in";
  const lockup = document.createElement("div");
  lockup.className = "auz__lockup";
  lockup.setAttribute("aria-hidden", "true");
  const mark = document.createElement("img");
  mark.src = "/brand/icon-white.svg";
  mark.alt = "";
  mark.width = 46;
  mark.height = 48;
  const word = document.createElement("span");
  word.className = "auz__word";
  word.innerHTML = "<span>We Dig</span><span>Creativity</span>";
  lockup.append(mark, word);
  const bar = document.createElement("span");
  bar.className = "auz__bar";
  bar.setAttribute("aria-hidden", "true");
  bar.appendChild(document.createElement("i"));
  /* The only part a screen reader hears, and only when there is news. */
  const say = document.createElement("p");
  say.className = "auz__say";
  say.setAttribute("role", "status");
  inner.append(lockup, bar, say);
  root.append(style, inner);

  return {
    root,
    say(text: string) {
      if (say.textContent !== text) say.textContent = text;
    },
    lift() {
      root.classList.add("auz--out");
      root
        .animate([{ opacity: 1 }, { opacity: 0 }], { duration: reduced ? 150 : 300, delay: reduced ? 0 : 120, fill: "forwards" })
        .finished.then(
          () => root.remove(),
          () => root.remove(),
        );
    },
  };
}

/** The demo signs nobody in, so it ends on a card that says where the dashboard would be. */
function demoCurtain(cover: ReturnType<typeof buildCover>) {
  const { root } = cover;
  root.classList.add("auz--demo");
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-label", "Demo complete");
  const card = document.createElement("div");
  card.className = "auz__card";
  const title = document.createElement("p");
  title.className = "auz__title";
  title.textContent = "You're in.";
  const body = document.createElement("p");
  body.textContent = "Demo mode: this is where your dashboard opens. Nobody was signed in.";
  const again = document.createElement("a");
  again.href = "/login";
  again.className = "au-btn au-btn--primary";
  again.textContent = "Back to the login page";
  card.append(title, body, again);
  root.appendChild(card);
  again.focus();
}
