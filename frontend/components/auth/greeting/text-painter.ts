/**
 * THE GREETING'S WORDS, DRAWN ON A CANVAS.
 *
 * The greeting is the largest thing on the login page, and as SVG `<text>`
 * every word of its cycle was a new Largest Contentful Paint candidate: the
 * page's LCP landed six seconds in, on whichever greeting was showing, long
 * after the form it should be measured by. Text drawn on a canvas is not a
 * candidate (an SVG mask was tried first; Chrome still attributes masked
 * text). So the words are drawn here, over the SVG that still carries the
 * pen-drawn words, which are paths and never counted.
 *
 * It replays the CSS it replaced, frame for frame: the script word strokes
 * on over 1.6s (dash 260) and its fill fades in from 1s over 0.7s; the
 * reveal wipes on over 1.2s; both wipe from the reading edge. One loop for
 * every layer, and it stops when the last one finishes.
 */

export type PaintKind = "script" | "reveal";

export type PaintLayer = {
  text: string;
  /** CSS font-family; a `var(--x)` inside it is resolved against the canvas. */
  family: string;
  weight: number;
  /** Baseline, in the SVG's user units. */
  y: number;
  size: number;
  maxWidth: number;
  dir: "ltr" | "rtl";
  kind: PaintKind;
  /** Seconds after the layer is ready. */
  delay: number;
};

type Live = PaintLayer & { font: string; start: number };

/** cubic-bezier(x1, y1, x2, y2) as a function of x, by bisection: plenty for a few layers a frame. */
function bezier(x1: number, y1: number, x2: number, y2: number) {
  const at = (a: number, b: number, t: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 24; i += 1) {
      const mid = (lo + hi) / 2;
      if (at(x1, x2, mid) < x) lo = mid;
      else hi = mid;
    }
    return at(y1, y2, (lo + hi) / 2);
  };
}
/* --au-ease, and CSS `ease`. */
const AU_EASE = bezier(0.2, 0.8, 0.2, 1);
const EASE = bezier(0.25, 0.1, 0.25, 1);
const clamp = (v: number) => Math.max(0, Math.min(1, v));

export class TextPainter {
  private layers = new Map<number, Live>();
  private next = 1;
  private raf = 0;
  private canvas: HTMLCanvasElement | null = null;
  private ro: ResizeObserver | null = null;
  private scale = 1;

  constructor(
    private width: number,
    private height: number,
    private still: boolean,
  ) {}

  attach(canvas: HTMLCanvasElement | null) {
    this.ro?.disconnect();
    this.canvas = canvas;
    if (!canvas) return;
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.resize();
  }

  configure(width: number, height: number, still: boolean) {
    const changed = width !== this.width || height !== this.height || still !== this.still;
    this.width = width;
    this.height = height;
    this.still = still;
    if (changed) this.resize();
  }

  /** Adds a layer once its font is ready; returns the remover. */
  add(layer: PaintLayer) {
    const id = this.next++;
    let removed = false;
    const family = this.resolveFamily(layer.family);
    const font = `${layer.weight} ${layer.size}px ${family}`;
    const begin = () => {
      if (removed) return;
      this.layers.set(id, { ...layer, family, font, start: performance.now() + layer.delay * 1000 });
      this.kick();
    };
    if (document.fonts?.load) document.fonts.load(font, layer.text).then(begin, begin);
    else begin();
    /* A script this page has never drawn (Japanese, Korean) can fall back
       to a system face a moment later; draw again once it has. */
    const late = window.setTimeout(() => this.kick(), 300);
    return () => {
      removed = true;
      window.clearTimeout(late);
      this.layers.delete(id);
      this.kick();
    };
  }

  /** Stops drawing and lets go of the canvas; the layers belong to their words, which remove themselves. */
  destroy() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.attach(null);
  }

  private resolveFamily(family: string) {
    const host = this.canvas ?? document.documentElement;
    return family.replace(/var\((--[\w-]+)\)/g, (_, name: string) => getComputedStyle(host).getPropertyValue(name).trim() || "sans-serif");
  }

  private resize() {
    const canvas = this.canvas;
    if (!canvas) return;
    const box = canvas.getBoundingClientRect();
    if (!box.width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(box.height * dpr);
    this.scale = (box.width * dpr) / this.width;
    this.kick();
  }

  private kick() {
    if (!this.raf) this.raf = requestAnimationFrame((now) => this.frame(now));
  }

  private frame(now: number) {
    this.raf = 0;
    const canvas = this.canvas;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);

    let busy = false;
    for (const layer of this.layers.values()) {
      const t = this.still ? Infinity : now - layer.start;
      if (t < 0) {
        busy = true;
        continue;
      }
      if (this.draw(ctx, layer, t)) busy = true;
    }
    if (busy) this.kick();
  }

  /** Draws one layer at `t` ms; true while it is still moving. */
  private draw(ctx: CanvasRenderingContext2D, layer: Live, t: number) {
    ctx.font = layer.font;
    ctx.direction = layer.dir;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    const measured = ctx.measureText(layer.text).width;
    const size = measured > layer.maxWidth ? (layer.size * layer.maxWidth) / measured : layer.size;
    if (size !== layer.size) ctx.font = `${layer.weight} ${size}px ${layer.family}`;

    /* The wipe: from the reading edge across the whole width. */
    const wipe = layer.kind === "reveal" ? AU_EASE(clamp(t / 1200)) : clamp(t / 1500);
    ctx.save();
    ctx.beginPath();
    if (layer.dir === "rtl") ctx.rect(this.width * (1 - wipe), -this.height, this.width * wipe, this.height * 3);
    else ctx.rect(0, -this.height, this.width * wipe, this.height * 3);
    ctx.clip();

    const x = this.width / 2;
    let moving = wipe < 1;
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#fff";
    if (layer.kind === "reveal") {
      ctx.fillText(layer.text, x, layer.y);
    } else {
      const draw = AU_EASE(clamp(t / 1600));
      const fill = EASE(clamp((t - 1000) / 700));
      if (fill < 1) {
        ctx.globalAlpha = 1 - fill;
        ctx.lineWidth = 1.4;
        ctx.setLineDash([260, 260]);
        ctx.lineDashOffset = 260 * (1 - draw);
        ctx.strokeText(layer.text, x, layer.y);
      }
      if (fill > 0) {
        ctx.globalAlpha = fill;
        ctx.setLineDash([]);
        ctx.fillText(layer.text, x, layer.y);
      }
      moving = moving || draw < 1 || fill < 1;
    }
    ctx.restore();
    return moving;
  }
}
