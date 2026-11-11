"use client";

import { useEffect } from "react";

/*
  THE HANDSHAKE FAVICON. Every so often the tab icon plays a short loop, like a GIF: the
  mark gives a quick double handshake that settles, the pen nib lights up orange, and a thin
  orange ring ripples out from the disc. Then the normal icon comes back.

  Browsers do not animate SVG or GIF favicons reliably, so the frames are drawn here on a
  64px canvas from the real mark (public/brand/icon-color.svg) and set as a temporary icon
  link, which is removed afterwards so the site's own icon returns untouched.

  It plays only while the tab is visible (hidden tabs freeze animation frames anyway), never
  for anyone who asks for reduced motion, and starts after the page has settled.
*/

const SIZE = 64;
const PLAY_MS = 1300;
const FIRST_MS = 5000;
const EVERY_MS = 22000;
const ORANGE = "#ff6500";

const ease = (t: number) => 1 - Math.pow(1 - t, 3);

export default function AnimatedFavicon() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = SIZE;
    const g = canvas.getContext("2d");
    if (!g) return;
    const mark = new Image();
    mark.src = "/brand/icon-color.svg";

    let link: HTMLLinkElement | null = null;
    let raf = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let alive = true;

    const draw = (t: number) => {
      const c = SIZE / 2;
      g.clearRect(0, 0, SIZE, SIZE);
      // The ring: a thin orange circle that ripples out and fades in the second half.
      if (t > 0.35) {
        const r = (t - 0.35) / 0.65;
        g.beginPath();
        g.arc(c, c, 25 + ease(r) * 5.5, 0, Math.PI * 2);
        g.strokeStyle = ORANGE;
        g.globalAlpha = 1 - r;
        g.lineWidth = 3;
        g.stroke();
        g.globalAlpha = 1;
      }
      // The white disc, the same ground as the site's own icon.
      g.beginPath();
      g.arc(c, c, 26, 0, Math.PI * 2);
      g.fillStyle = "#fff";
      g.fill();
      // The handshake: two quick swings that settle, about the disc's centre.
      const angle = Math.sin(t * Math.PI * 4) * (1 - ease(t)) * 0.28;
      const h = 38, w = (h * 904) / 944;
      g.save();
      g.translate(c, c + 1);
      g.rotate(angle);
      g.drawImage(mark, -w / 2, -h / 2, w, h);
      g.restore();
    };

    const end = () => {
      link?.remove();
      link = null;
    };

    const play = () => {
      if (!alive || document.visibilityState !== "visible" || !mark.complete || !mark.naturalWidth) return;
      link ??= Object.assign(document.createElement("link"), { rel: "icon", type: "image/png", sizes: `${SIZE}x${SIZE}` });
      document.head.appendChild(link);
      const start = performance.now();
      let last = 0;
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / PLAY_MS);
        // About 24 frames a second is plenty for a 16px icon, and keeps the work small.
        if (now - last > 40 || t === 1) {
          last = now;
          draw(t);
          if (link) link.href = canvas.toDataURL("image/png");
        }
        if (t < 1 && alive) raf = requestAnimationFrame(step);
        else end();
      };
      raf = requestAnimationFrame(step);
    };

    const loop = (wait: number) => {
      timer = setTimeout(() => {
        play();
        loop(EVERY_MS);
      }, wait);
    };
    loop(FIRST_MS);

    return () => {
      alive = false;
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      end();
    };
  }, []);

  return null;
}
