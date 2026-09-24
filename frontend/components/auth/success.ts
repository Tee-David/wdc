import type { Stage } from "@/components/auth/stage/stage-store";

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
const EMPHASIZED = "cubic-bezier(.76,0,.24,1)";
const NAVY = "#000065";

/**
 * THE DOOR OPENS FROM THE ORB.
 *
 *   0ms     the ring closes (it has waited out its 700ms minimum already)
 *   260ms   the orb blinks and floods with colour
 *   700ms   a navy circle grows from the orb until it covers the screen
 *   1350ms  navigate, underneath the circle
 *
 * The overlay is appended to <body> by hand rather than rendered by React,
 * because it has to outlive this page: it stays over the screen while the
 * dashboard loads and fades once the address bar has moved on, so there is
 * never a white frame between the two.
 *
 * Reduced motion: no flood, no circle. A 200ms fade to navy, then go.
 */
export async function playSuccess({
  stage,
  destination,
  navigate,
  demo,
}: {
  stage: Stage;
  destination: string;
  navigate: (href: string) => void;
  demo: boolean;
}) {
  const reduced = stage.reduced;
  await stage.ringEnd(true);
  if (!reduced) stage.celebrate();
  await sleep(reduced ? 0 : 440);

  const overlay = document.createElement("div");
  overlay.className = "au-zoom";
  overlay.setAttribute("aria-hidden", "true");
  const centre = stage.orbCentre() ?? { x: window.innerWidth / 2, y: window.innerHeight / 2, r: 60 };
  overlay.style.setProperty("--x", `${centre.x}px`);
  overlay.style.setProperty("--y", `${centre.y}px`);
  document.body.appendChild(overlay);

  if (reduced) {
    await overlay.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: "forwards" }).finished.catch(() => {});
  } else {
    const r1 = Math.hypot(Math.max(centre.x, window.innerWidth - centre.x), Math.max(centre.y, window.innerHeight - centre.y));
    await overlay
      .animate(
        [{ clipPath: `circle(${centre.r}px at ${centre.x}px ${centre.y}px)` }, { clipPath: `circle(${r1 + 2}px at ${centre.x}px ${centre.y}px)` }],
        { duration: 650, easing: EMPHASIZED, fill: "forwards" },
      )
      .finished.catch(() => {});
  }

  if (demo) {
    demoCurtain(overlay);
    return;
  }

  navigate(destination);

  /* Lift the curtain once we have actually arrived somewhere else. If the
     client-side navigation never lands (an old tab, a flaky network), a real
     page load finishes the job. */
  const started = performance.now();
  const lift = () => {
    if (window.location.pathname !== "/login") {
      window.setTimeout(() => {
        overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: "forwards" }).finished.then(
          () => overlay.remove(),
          () => overlay.remove(),
        );
      }, 120);
      return;
    }
    if (performance.now() - started > 8000) {
      window.location.assign(destination);
      return;
    }
    requestAnimationFrame(lift);
  };
  requestAnimationFrame(lift);
}

/** The demo signs nobody in, so it ends on a card that says where the dashboard would be. */
function demoCurtain(overlay: HTMLElement) {
  overlay.classList.add("au-zoom--demo");
  overlay.removeAttribute("aria-hidden");
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-label", "Demo complete");
  overlay.style.background = NAVY;
  const card = document.createElement("div");
  card.className = "au-zoom__card";
  const title = document.createElement("p");
  title.className = "au-zoom__title";
  title.textContent = "You're in.";
  const body = document.createElement("p");
  body.textContent = "Demo mode: this is where your dashboard opens. Nobody was signed in.";
  const again = document.createElement("a");
  again.href = "/login";
  again.className = "au-btn au-btn--primary";
  again.textContent = "Back to the login page";
  card.append(title, body, again);
  overlay.appendChild(card);
  again.focus();
}
