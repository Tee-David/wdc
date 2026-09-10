"use client";

import { useEffect, useRef } from "react";
import { Camera, Mesh, Plane, Program, Renderer, Texture, Transform } from "ogl";

import "./circular-gallery.css";

/**
 * A wheel of images bent into a semicircle, rendered in WebGL.
 *
 * Adapted from the React Bits component, with one structural change that
 * matters more than all the rest: THE WHEEL DOES NOT LISTEN TO INPUT.
 *
 * The original binds `wheel`, `mousedown/move/up` and `touchstart/move/end` to
 * `window` and spins itself. Dropped into a marketing page that would be a trap:
 * every wheel tick anywhere on the site would turn this gallery, and on a phone
 * the `touchmove` handler calls `preventDefault`, so the page could not be
 * scrolled past it at all. Here the rotation is a pure function of `progress`,
 * which the section above measures from its own travel through the viewport. The
 * page scrolls; the wheel follows. Nothing is intercepted.
 *
 * `progress` is passed through a ref rather than a prop dependency, because the
 * scroll handler updates it on every frame and re-running the effect would tear
 * down and rebuild the entire WebGL context sixty times a second.
 */

export type GalleryItem = { image: string; text?: string };

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/* ------------------------------------------------------------------ label */
/* Optional, and off by default. A caption baked into a canvas texture cannot
   follow the theme without rebuilding the context, so the page's own markup is
   a better place for words than this is. */
function textTexture(gl: GLContext, text: string, font: string, color: string) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width);
  const size = Number(font.match(/(\d+)px/)?.[1] ?? 30);
  canvas.width = w + 20;
  canvas.height = Math.ceil(size * 1.2) + 20;
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new Texture(gl, { generateMipmaps: false });
  texture.image = canvas;
  return { texture, width: canvas.width, height: canvas.height };
}

type GLContext = Renderer["gl"];
type Screen = { width: number; height: number };
type Viewport = { width: number; height: number };

class Media {
  plane!: Mesh;
  program!: Program;
  extra = 0;
  x = 0;
  width = 0;
  widthTotal = 0;
  padding = 0;

  constructor(
    private o: {
      geometry: Plane;
      gl: GLContext;
      image: string;
      index: number;
      length: number;
      scene: Transform;
      screen: Screen;
      viewport: Viewport;
      bend: number;
      borderRadius: number;
      perView: number;
      text?: string;
      textColor: string;
      font: string;
    },
  ) {
    this.createShader();
    this.plane = new Mesh(o.gl, { geometry: o.geometry, program: this.program });
    this.plane.setParent(o.scene);
    if (o.text) this.createTitle();
    this.onResize({});
  }

  private createShader() {
    const { gl, image, borderRadius } = this.o;
    const texture = new Texture(gl, { generateMipmaps: true });
    this.program = new Program(gl, {
      depthTest: false,
      depthWrite: false,
      vertex: `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform float uTime;
        uniform float uSpeed;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          /* the ripple as a tile picks up speed; tiny at rest, so a parked
             wheel is flat rather than permanently wobbling */
          p.z = (sin(p.x * 4.0 + uTime) * 1.5 + cos(p.y * 2.0 + uTime) * 1.5) * (0.1 + uSpeed * 0.5);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        uniform vec2 uImageSizes;
        uniform vec2 uPlaneSizes;
        uniform sampler2D tMap;
        uniform float uBorderRadius;
        varying vec2 vUv;

        float roundedBoxSDF(vec2 p, vec2 b, float r) {
          vec2 d = abs(p) - b;
          return length(max(d, vec2(0.0))) + min(max(d.x, d.y), 0.0) - r;
        }

        void main() {
          /* cover, not stretch: the shorter axis is the one that gets cropped */
          vec2 ratio = vec2(
            min((uPlaneSizes.x / uPlaneSizes.y) / (uImageSizes.x / uImageSizes.y), 1.0),
            min((uPlaneSizes.y / uPlaneSizes.x) / (uImageSizes.y / uImageSizes.x), 1.0)
          );
          vec2 uv = vec2(
            vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
            vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
          );
          vec4 color = texture2D(tMap, uv);
          float d = roundedBoxSDF(vUv - 0.5, vec2(0.5 - uBorderRadius), uBorderRadius);
          float alpha = 1.0 - smoothstep(-0.002, 0.002, d);
          gl_FragColor = vec4(color.rgb, alpha);
        }
      `,
      uniforms: {
        tMap: { value: texture },
        uPlaneSizes: { value: [0, 0] },
        uImageSizes: { value: [0, 0] },
        uSpeed: { value: 0 },
        uTime: { value: 100 * Math.random() },
        uBorderRadius: { value: borderRadius },
      },
      transparent: true,
    });

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = image;
    img.onload = () => {
      texture.image = img;
      this.program.uniforms.uImageSizes.value = [img.naturalWidth, img.naturalHeight];
    };
  }

  private createTitle() {
    const { gl, text, font, textColor } = this.o;
    const { texture, width, height } = textTexture(gl, text!, font, textColor);
    const program = new Program(gl, {
      vertex: `
        attribute vec3 position; attribute vec2 uv;
        uniform mat4 modelViewMatrix; uniform mat4 projectionMatrix;
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragment: `
        precision highp float; uniform sampler2D tMap; varying vec2 vUv;
        void main() { vec4 c = texture2D(tMap, vUv); if (c.a < 0.1) discard; gl_FragColor = c; }
      `,
      uniforms: { tMap: { value: texture } },
      transparent: true,
    });
    const mesh = new Mesh(gl, { geometry: new Plane(gl), program });
    const h = this.plane.scale.y * 0.13;
    mesh.scale.set(h * (width / height), h, 1);
    mesh.position.y = -this.plane.scale.y * 0.5 - h * 0.5 - 0.06;
    mesh.setParent(this.plane);
  }

  update(scroll: { current: number; last: number }, direction: "left" | "right") {
    this.plane.position.x = this.x - scroll.current - this.extra;

    const x = this.plane.position.x;
    const H = this.o.viewport.width / 2;
    const bend = this.o.bend;

    if (bend === 0) {
      this.plane.position.y = 0;
      this.plane.rotation.z = 0;
    } else {
      /* The arc: a circle of radius R through the viewport's half-width, so the
         tiles sit ON a curve and tilt to match its tangent rather than being
         merely nudged downwards. `effectiveX` is clamped to H so tiles beyond
         the edge stop diving and the ends of the wheel stay level. */
      const B = Math.abs(bend);
      const R = (H * H + B * B) / (2 * B);
      const ex = Math.min(Math.abs(x), H);
      const arc = R - Math.sqrt(R * R - ex * ex);
      /* Centre the BAND, not the apex. Without this the arc hangs off a fixed
         top edge, so the deeper the bend the further the whole wheel sits below
         the middle of its frame with dead space above it. Lifting by half the
         maximum drop puts the apex as far above centre as the ends fall below,
         which is what makes it read as a wheel sitting in the box. */
      const drop = R - Math.sqrt(Math.max(0, R * R - H * H));
      this.plane.position.y = (bend > 0 ? -arc : arc) + (bend > 0 ? drop / 2 : -drop / 2);
      this.plane.rotation.z = (bend > 0 ? -1 : 1) * Math.sign(x) * Math.asin(ex / R);
    }

    this.program.uniforms.uTime.value += 0.04;
    this.program.uniforms.uSpeed.value = scroll.current - scroll.last;

    /* Wrap: a tile that has left one side is moved a whole track-width round to
       the other, so the arc is never half empty however far it has turned. */
    const half = this.plane.scale.x / 2;
    const edge = this.o.viewport.width / 2;
    if (direction === "right" && this.plane.position.x + half < -edge) this.extra -= this.widthTotal;
    if (direction === "left" && this.plane.position.x - half > edge) this.extra += this.widthTotal;
  }

  onResize({ screen, viewport }: { screen?: Screen; viewport?: Viewport }) {
    if (screen) this.o.screen = screen;
    if (viewport) this.o.viewport = viewport;

    /* Sized from HOW MANY SHOULD BE VISIBLE, not from a fixed pixel guess. One
       slot is the viewport divided by `perView`, the tile fills the slot less
       its gutter, and it stays square because the artwork is square — the
       original's 700x900 portrait planes cropped these to a letterbox. */
    /* `perView` is the DESKTOP count. Holding six across a 390px phone would
       make every tile 65px wide, which is a texture, not an image — so narrow
       screens show fewer and larger. Fractional counts are deliberate: ending
       on a half tile is what signals the wheel continues past the edge. */
    const w = this.o.screen.width;
    const per = w < 640 ? Math.min(this.o.perView, 2.5)
              : w < 1024 ? Math.min(this.o.perView, 4)
              : this.o.perView;
    const slot = this.o.viewport.width / per;
    this.padding = slot * 0.12;
    this.plane.scale.x = slot - this.padding;
    this.plane.scale.y = this.plane.scale.x;
    this.program.uniforms.uPlaneSizes.value = [this.plane.scale.x, this.plane.scale.y];

    this.width = slot;
    this.widthTotal = slot * this.o.length;
    this.x = slot * this.o.index;
  }
}

class Wheel {
  private renderer: Renderer;
  private gl: GLContext;
  private camera: Camera;
  private scene: Transform;
  private geometry!: Plane;
  private medias: Media[] = [];
  private screen: Screen = { width: 0, height: 0 };
  private viewport: Viewport = { width: 0, height: 0 };
  private scroll = { current: 0, target: 0, last: 0, ease: 0.06 };
  private raf = 0;
  private ro?: ResizeObserver;
  private io?: IntersectionObserver;
  private running = false;
  private span = 1;

  constructor(
    private container: HTMLElement,
    private opts: {
      items: GalleryItem[];
      bend: number;
      borderRadius: number;
      perView: number;
      textColor: string;
      font: string;
      labels: boolean;
      ease: number;
    },
    private getProgress: () => number,
  ) {
    this.renderer = new Renderer({ alpha: true, antialias: true, dpr: Math.min(window.devicePixelRatio || 1, 2) });
    this.gl = this.renderer.gl;
    this.gl.clearColor(0, 0, 0, 0);
    container.appendChild(this.gl.canvas);

    this.camera = new Camera(this.gl);
    this.camera.fov = 45;
    this.camera.position.z = 20;
    this.scene = new Transform();
    this.scroll.ease = opts.ease;

    this.measure();
    this.geometry = new Plane(this.gl, { heightSegments: 40, widthSegments: 80 });
    this.build();

    this.ro = new ResizeObserver(() => this.measure());
    this.ro.observe(container);

    /* Stop burning GPU once the wheel scrolls out of view. Without this the
       render loop runs for the whole visit — it is a WebGL context redrawing
       twelve textured planes sixty times a second for a section nobody is
       looking at, on a page that already carries six other animated stages.
       Borrowed from the ring gallery in the photography build, which learned
       the same lesson. */
    this.io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) this.start();
        else this.stop();
      },
      { threshold: 0 },
    );
    this.io.observe(container);
  }

  private build() {
    const { items, bend, borderRadius, perView, textColor, font, labels } = this.opts;
    /* Doubled, so a full turn through the real set still has tiles queued to
       wrap in behind it and the arc never shows a gap. */
    const list = items.concat(items);
    this.span = items.length;
    this.medias = list.map((it, index) => new Media({
      geometry: this.geometry,
      gl: this.gl,
      image: it.image,
      index,
      length: list.length,
      scene: this.scene,
      screen: this.screen,
      viewport: this.viewport,
      bend,
      borderRadius,
      perView,
      text: labels ? it.text : undefined,
      textColor,
      font,
    }));
  }

  private measure() {
    this.screen = { width: this.container.clientWidth, height: this.container.clientHeight };
    if (!this.screen.width || !this.screen.height) return;
    this.renderer.setSize(this.screen.width, this.screen.height);
    this.camera.perspective({ aspect: this.screen.width / this.screen.height });
    const h = 2 * Math.tan((this.camera.fov * Math.PI) / 180 / 2) * this.camera.position.z;
    this.viewport = { width: h * this.camera.aspect, height: h };
    this.medias.forEach((m) => m.onResize({ screen: this.screen, viewport: this.viewport }));
  }

  private start() {
    if (this.running) return;
    this.running = true;
    this.raf = requestAnimationFrame(this.tick);
  }

  private stop() {
    if (!this.running) return;
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private tick = () => {
    const slot = this.medias[0]?.width ?? 0;
    /* One unit of progress turns the wheel past every image in the set once.
       Starting half a viewport in means the arc is already full at progress 0,
       instead of the first tile sitting alone in the middle. */
    this.scroll.target = this.getProgress() * slot * this.span;
    this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.scroll.ease);
    const direction = this.scroll.current > this.scroll.last ? "right" : "left";
    this.medias.forEach((m) => m.update(this.scroll, direction));
    this.renderer.render({ scene: this.scene, camera: this.camera });
    this.scroll.last = this.scroll.current;
    if (this.running) this.raf = requestAnimationFrame(this.tick);
  };

  destroy() {
    this.stop();
    this.io?.disconnect();
    this.ro?.disconnect();
    this.gl.canvas.parentNode?.removeChild(this.gl.canvas);
    /* WebGL contexts are a scarce browser resource — a handful of leaked ones
       and every later canvas on the site silently fails to initialise. */
    this.gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}

export default function CircularGallery({
  items,
  progress,
  bend = 3,
  borderRadius = 0.06,
  perView = 6,
  labels = false,
  textColor = "#ffffff",
  font = "600 26px 'Space Grotesk', system-ui, sans-serif",
  ease = 0.06,
  className = "",
}: {
  items: GalleryItem[];
  /** Ref holding 0-1. A ref, not a prop: this changes every frame. */
  progress: { current: number };
  bend?: number;
  borderRadius?: number;
  /** How many tiles span the container's width. */
  perView?: number;
  labels?: boolean;
  textColor?: string;
  font?: string;
  ease?: number;
  className?: string;
}) {
  const host = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el || !items.length) return;
    let wheel: Wheel | null = null;
    try {
      wheel = new Wheel(
        el,
        { items, bend, borderRadius, perView, textColor, font, labels, ease },
        () => progress.current,
      );
    } catch {
      /* No WebGL (old device, blocked context, a headless browser without a
         GPU). The static fallback underneath is already in the markup, so the
         section degrades to a plain row rather than to an empty box. */
      el.dataset.failed = "true";
    }
    return () => wheel?.destroy();
  }, [items, progress, bend, borderRadius, perView, textColor, font, labels, ease]);

  return <div className={`cgal ${className}`.trim()} ref={host} aria-hidden="true" />;
}
