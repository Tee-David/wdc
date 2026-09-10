"use client";

import { useEffect, useRef } from "react";
import { Camera, Mesh, Plane, Program, Renderer, Texture, Transform } from "ogl";

import "./circular-gallery.css";

/* The narrowest a wheel card may be rendered, in CSS pixels. Below this the
   artwork stops being legible and the ring's radius grows past what the frame
   can show. */
const MIN_CARD_PX = 104;

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
  /** Where this card sits on the ring, in radians clockwise from the top. */
  baseAngle: number;

  constructor(
    private o: {
      geometry: Plane;
      gl: GLContext;
      image: string;
      index: number;
      slots: number;
      gap: number;
      scene: Transform;
      borderRadius: number;
      text?: string;
      textColor: string;
      font: string;
    },
  ) {
    this.baseAngle = (o.index / o.slots) * Math.PI * 2;
    this.createShader();
    this.plane = new Mesh(o.gl, { geometry: o.geometry, program: this.program });
    this.plane.setParent(o.scene);
    if (o.text) this.createTitle();
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
        varying vec2 vUv;
        void main() {
          /* Flat. The upstream component displaces z by a travelling sine so
             the tiles ripple, and at any amplitude that reads as the artwork
             wobbling rather than as motion — these are printed pieces, and
             paper does not undulate. The plane geometry is 1x1 segments now
             because nothing needs vertices to displace. */
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
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

  update(ringAngle: number, radius: number, centreY: number) {
    /* A real circle, not a bent strip. theta is measured clockwise from the top
       of the ring, so slot 0 sits at the apex and the rest fan away either
       side. The centre is BELOW the container and the radius is larger than the
       container's half-height, so the bottom of the ring falls outside the box
       and is clipped — which is what leaves a semicircle across the top with
       the rest hidden, the framing from the photography build. */
    const theta = this.baseAngle + ringAngle;
    this.plane.position.x = Math.sin(theta) * radius;
    this.plane.position.y = centreY + Math.cos(theta) * radius;
    /* Counter-rotate so each card stays tangential to the ring. Without this
       they stay upright and the arc reads as tiles scattered along a curve
       rather than as one wheel. */
    this.plane.rotation.z = -theta;
  }

  /** Card size derives from the RING, so proportions hold at any viewport. */
  resize(radius: number, slots: number) {
    /* One slot's arc pitch is the space a card has to live in; `gap` is how
       much of that pitch is left empty. Sizing from the pitch rather than from
       the viewport is what keeps the spacing even as the ring resizes. */
    const pitch = (2 * Math.PI) / slots;
    const w = radius * pitch * (1 - this.o.gap);
    this.plane.scale.x = w;
    this.plane.scale.y = w;
    this.program.uniforms.uPlaneSizes.value = [w, w];
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
  private angle = 0;
  private radius = 1;
  private centreY = 0;
  private slots = 1;
  private raf = 0;
  private ro?: ResizeObserver;
  private io?: IntersectionObserver;
  private running = false;

  constructor(
    private container: HTMLElement,
    private opts: {
      items: GalleryItem[];
      borderRadius: number;
      /** How many cards span the container's width across the top arc. */
      perView: number;
      /** Total positions on the ring; more than `items`, which cycle. */
      slots: number;
      /** Share of each slot's arc left empty between cards, 0-1. */
      gap: number;
      /** Apex inset from the top edge, as a share of container height. */
      topInset: number;
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

    this.measure();
    this.geometry = new Plane(this.gl);
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
    const { items, borderRadius, slots, gap, textColor, font, labels } = this.opts;
    /* The ring has more SLOTS than there are images, because only the top arc
       is on screen: at twelve slots a twelve-image ring would need the whole
       circle visible to show them all. Images cycle through the slots, so a
       full turn still passes every one of them. */
    this.slots = slots;
    this.medias = Array.from({ length: slots }, (_, index) => {
      const it = items[index % items.length];
      return new Media({
        geometry: this.geometry,
        gl: this.gl,
        image: it.image,
        index,
        slots,
        gap,
        scene: this.scene,
        borderRadius,
        text: labels ? it.text : undefined,
        textColor,
        font,
      });
    });
  }

  private measure() {
    this.screen = { width: this.container.clientWidth, height: this.container.clientHeight };
    if (!this.screen.width || !this.screen.height) return;
    this.renderer.setSize(this.screen.width, this.screen.height);
    this.camera.perspective({ aspect: this.screen.width / this.screen.height });
    const h = 2 * Math.tan((this.camera.fov * Math.PI) / 180 / 2) * this.camera.position.z;
    this.viewport = { width: h * this.camera.aspect, height: h };

    /* Solve the ring from HOW MANY SHOULD BE VISIBLE across the top.
       A card at angle theta sits at x = sin(theta) * R, so the outermost
       visible card is at half the container width:
           sin(visibleArc / 2) * R = viewport.width / 2
       and visibleArc is just the arc those cards occupy, (perView/slots) * 2pi.
       Deriving R this way means changing `perView` changes what you see rather
       than needing the radius retuned by hand. */
    /* `perView` is the intent for a WIDE container, and it cannot be taken
       literally on a phone. Six across 323px is a 54px thumbnail on a ring so
       large that its arc leaves the frame two cards either side of the apex —
       which is exactly what it looked like: a shallow curve of stamps with the
       ends falling off the screen and most of the box empty. So the count is
       capped by a card that is still worth looking at. Deriving it here rather
       than at the call site means every caller gets it, and it re-derives on
       resize with everything else. */
    const across = Math.min(
      this.opts.perView,
      Math.max(2, Math.floor(this.screen.width / MIN_CARD_PX)),
    );
    const arc = (across / this.slots) * Math.PI * 2;
    this.radius = (this.viewport.width / 2) / Math.max(0.2, Math.sin(arc / 2));

    /* Then drop the centre so the apex CARD sits inside the top edge — the
       apex POINT is not enough, because a card is centred on it and half its
       height reaches above. Half a card is derived here rather than guessed:
       it falls out of the same pitch the cards are sized from, so changing
       `slots` or `gap` cannot silently push the top row off the frame. */
    const pitch = (2 * Math.PI) / this.slots;
    const halfCard = (this.radius * pitch * (1 - this.opts.gap)) / 2;
    const apex = this.viewport.height / 2 - halfCard - this.opts.topInset * this.viewport.height;
    this.centreY = apex - this.radius;

    this.medias.forEach((m) => m.resize(this.radius, this.slots));
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
    /* One unit of progress turns the ring past every image in the set.

       NEGATIVE, and that is the whole point: the ring has to travel AGAINST
       the scroll. Turning it with the scroll makes the artwork chase the page
       away from the reader — the eye follows a piece down, the ring carries it
       down too, and nothing new ever arrives. Against it, each turn brings the
       next piece up into the space the scroll just opened, which is the motion
       that reads as browsing rather than as fleeing. */
    const target = -this.getProgress() * ((2 * Math.PI * this.opts.items.length) / this.slots);
    this.angle = lerp(this.angle, target, this.opts.ease);
    this.medias.forEach((m) => m.update(this.angle, this.radius, this.centreY));
    this.renderer.render({ scene: this.scene, camera: this.camera });
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
  borderRadius = 0.06,
  perView = 6,
  slots = 24,
  gap = 0.16,
  topInset = 0.02,
  labels = false,
  textColor = "#ffffff",
  font = "600 26px 'Space Grotesk', system-ui, sans-serif",
  ease = 0.07,
  className = "",
}: {
  items: GalleryItem[];
  /** Ref holding 0-1. A ref, not a prop: this changes every frame. */
  progress: { current: number };
  borderRadius?: number;
  /** How many cards span the container's width across the top of the ring. */
  perView?: number;
  /** Positions on the ring. More than `items`, which cycle through them —
      only the top arc is visible, so a ring with one slot per image would have
      to show its whole circle to show them all. */
  slots?: number;
  /** Share of each slot's arc left empty between cards, 0-1. */
  gap?: number;
  /** How far the ring's apex sits below the top edge, as a share of height. */
  topInset?: number;
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
        { items, borderRadius, perView, slots, gap, topInset, textColor, font, labels, ease },
        () => progress.current,
      );
    } catch {
      /* No WebGL (old device, blocked context, a headless browser without a
         GPU). The static fallback underneath is already in the markup, so the
         section degrades to a plain row rather than to an empty box. */
      el.dataset.failed = "true";
    }
    return () => wheel?.destroy();
  }, [items, progress, borderRadius, perView, slots, gap, topInset, textColor, font, labels, ease]);

  return <div className={`cgal ${className}`.trim()} ref={host} aria-hidden="true" />;
}
