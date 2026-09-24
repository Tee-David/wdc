/**
 * THE STAGE: the orb, the ring around it and the greeting above it, driven by
 * one object that the form talks to.
 *
 * Plain TypeScript rather than React state, because almost everything here
 * happens per frame or on a timer, and a React render per frame is exactly
 * what a login form must never pay for while somebody is typing. Components
 * subscribe only to the two things they draw (the greeting's name, the band's
 * compact line), through `subscribe`/`snapshot`.
 *
 * The orb engine arrives late (it is imported after first paint), so every
 * command is written to `desired` first and replayed when an engine attaches.
 * Until then the CSS face shows the same state, so the character is never
 * blank and never wrong.
 */

export type OrbMood = "idle" | "reading" | "private" | "attentive" | "watching" | "success";

/** What the WebGL engine and the CSS face both know how to do. */
export interface OrbEngine {
  setLook(x: number, y: number): void;
  setTurn(radians: number): void;
  setHold(value: number): void;
  setMix(value: number): void;
  setFollow(on: boolean): void;
  blinkNow(): void;
  turnNow(): number;
}

export type RingMode = "hidden" | "progress" | "indeterminate" | "complete" | "drain";

export interface RingView {
  setMode(mode: RingMode): void;
  /** 0 to 100. */
  setProgress(value: number): void;
}

type Greeting = { name: string | null; lang: string | null; line: string };

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

export const RING_MIN_VISIBLE_MS = 700;

export class Stage {
  private engine: OrbEngine | null = null;
  private desired = { look: { x: 0, y: 0.08 }, turn: 0, hold: 0, mix: 0, follow: true };
  private mood: OrbMood = "idle";
  private moodTimer = 0;
  private scripted = false;
  private ring: RingView | null = null;
  private ringStart = 0;
  private ringRaf = 0;
  private ringValue = 0;
  private listeners = new Set<() => void>();
  private greeting: Greeting = { name: null, lang: null, line: "Hello" };
  /** The language on screen right now, reported by the greeting as it cycles. */
  currentLang: { lang: string; text: string } | null = null;
  /** The box the orb is drawn in; its centre is where the gaze starts from. */
  orbBox: HTMLElement | null = null;

  attachBox(box: HTMLElement | null) {
    this.orbBox = box;
  }

  /** The greeting reports what it is showing, and the one-line version of it. */
  showing(lang: string, text: string, line: string) {
    this.currentLang = { lang, text };
    this.setLine(line);
  }

  /* ---------------------------------------------------------------- wiring */

  get reduced() {
    return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  get touch() {
    return typeof window !== "undefined" && !window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  }

  attachEngine(engine: OrbEngine | null) {
    this.engine = engine;
    if (!engine) return;
    const d = this.desired;
    engine.setFollow(d.follow);
    engine.setLook(d.look.x, d.look.y);
    engine.setTurn(d.turn);
    engine.setHold(d.hold);
    engine.setMix(d.mix);
  }

  attachRing(ring: RingView | null) {
    this.ring = ring;
    ring?.setMode("hidden");
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  greetingSnapshot = () => this.greeting;

  private emit() {
    for (const listener of this.listeners) listener();
  }

  /* ------------------------------------------------------------ primitives */

  private look(x: number, y: number) {
    this.desired.look = { x, y };
    this.engine?.setLook(x, y);
  }
  private turn(radians: number) {
    this.desired.turn = radians;
    this.engine?.setTurn(radians);
    /* Which way it faces, on the box, whichever engine is drawing: the shader
       has no DOM of its own to say so. */
    if (this.orbBox) this.orbBox.dataset.facing = Math.abs(radians) > Math.PI / 2 ? "away" : "you";
  }
  private hold(value: number) {
    this.desired.hold = value;
    this.engine?.setHold(value);
  }
  private mix(value: number) {
    this.desired.mix = value;
    this.engine?.setMix(value);
  }
  private follow(on: boolean) {
    this.desired.follow = on;
    this.engine?.setFollow(on);
  }

  /* ----------------------------------------------------------------- moods */

  setMood(mood: OrbMood) {
    if (this.scripted && mood !== "success") {
      /* A head shake in progress finishes first and then restores whatever
         mood was asked for in the meantime. */
      this.mood = mood;
      return;
    }
    this.mood = mood;
    this.applyMood();
  }

  getMood() {
    return this.mood;
  }

  private applyMood() {
    window.clearTimeout(this.moodTimer);
    const mood = this.mood;
    if (mood !== "private") this.turn(0);
    if (mood !== "success") this.hold(0);

    switch (mood) {
      case "idle":
        if (!this.touch) {
          this.follow(true);
        } else {
          /* No pointer to follow on a phone, so it looks toward the form and
             glances about now and then, which is what keeps it alive. */
          this.follow(false);
          this.look(0.22, -0.38);
          this.glance(6000, 9000, [0.55, 0.05], [-0.4, -0.1], [0.22, -0.38]);
        }
        break;
      case "reading":
        this.follow(false);
        break;
      case "private":
        this.follow(false);
        this.look(0, 0.08);
        this.turn(Math.PI);
        break;
      case "attentive":
        this.follow(false);
        this.look(0, 0.05);
        break;
      case "watching":
        this.follow(false);
        this.look(0, 0.02);
        this.glance(2800, 4500, [0.6, -0.1], [-0.6, -0.1], [0, 0.02], true);
        break;
      case "success":
        this.follow(false);
        this.look(0, 0.05);
        this.engine?.blinkNow();
        this.mix(1);
        break;
    }
  }

  /** Every `min`-`max` ms, look at one of two points for 900ms and come back. */
  private glance(min: number, max: number, a: [number, number], b: [number, number], home: [number, number], blink = false) {
    if (this.reduced) return;
    const schedule = () => {
      this.moodTimer = window.setTimeout(() => {
        const [x, y] = Math.random() < 0.5 ? a : b;
        this.look(x, y);
        this.moodTimer = window.setTimeout(() => {
          this.look(home[0], home[1]);
          if (blink && Math.random() < 0.4) this.engine?.blinkNow();
          schedule();
        }, 900);
      }, min + Math.random() * (max - min));
    };
    schedule();
  }

  /** Gaze toward a point on screen, e.g. the caret in the email field. */
  lookAtPoint(clientX: number, clientY: number) {
    const box = this.orbBox?.getBoundingClientRect();
    if (!box || !box.width) return;
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    const dx = clientX - cx;
    const dy = cy - clientY;
    const length = Math.max(Math.hypot(dx, dy), (box.width / 2) * 3);
    this.look((dx / length) * 0.9, (dy / length) * 0.9);
  }

  /** Wrong credentials: face you, squint, shake. */
  async shakeHead() {
    if (this.scripted) return;
    this.scripted = true;
    window.clearTimeout(this.moodTimer);
    this.follow(false);
    try {
      if (this.reduced) {
        this.turn(0);
        this.hold(0.55);
        await sleep(600);
        return;
      }
      if (Math.abs(this.desired.turn) > 0.3 || Math.abs(this.engine?.turnNow() ?? 0) > 0.3) {
        this.turn(0);
        const deadline = performance.now() + 900;
        while (Math.abs(this.engine?.turnNow() ?? 0) > 0.3 && performance.now() < deadline) await sleep(30);
      }
      this.hold(0.5);
      for (const x of [-0.5, 0.5, -0.4, 0.35, 0]) {
        this.look(x, 0);
        await sleep(130);
      }
      await sleep(250);
    } finally {
      this.hold(0);
      this.scripted = false;
      this.applyMood();
    }
  }

  /** Email sent: a nod and a blink. */
  async nod() {
    if (this.scripted) return;
    this.scripted = true;
    window.clearTimeout(this.moodTimer);
    this.follow(false);
    this.turn(0);
    try {
      if (this.reduced) {
        this.hold(1);
        await sleep(140);
        this.hold(0);
        return;
      }
      for (const y of [0.08, -0.35, 0.2, -0.2, 0.08]) {
        this.look(0, y);
        await sleep(140);
      }
      this.engine?.blinkNow();
    } finally {
      this.scripted = false;
      this.applyMood();
    }
  }

  /** Not your fault (the network): a small puzzled tilt, no head shake. */
  async confused() {
    if (this.scripted) return;
    this.scripted = true;
    window.clearTimeout(this.moodTimer);
    this.follow(false);
    this.turn(0);
    this.look(0.18, -0.3);
    await sleep(600);
    this.scripted = false;
    this.applyMood();
  }

  celebrate() {
    this.scripted = false;
    this.setMood("success");
  }

  reset() {
    this.mix(0);
    this.setMood("idle");
  }

  /* ------------------------------------------------------------------ ring */

  /**
   * THE RING TELLS THE TRUTH. It races to about 80% while a request is young,
   * creeps toward 90% while it is slow, and only closes when the answer
   * arrives. It never claims more than it knows.
   */
  ringBegin() {
    const ring = this.ring;
    cancelAnimationFrame(this.ringRaf);
    this.ringStart = performance.now();
    this.ringValue = 0;
    if (!ring) return;
    ring.setProgress(0);
    ring.setMode("progress");
    let t80 = 0;
    const step = (now: number) => {
      const t = now - this.ringStart;
      let p = 80 * (1 - Math.exp(-t / 600));
      if (p >= 79) {
        if (!t80) t80 = t;
        p = 80 + 10 * (1 - Math.exp(-(t - t80) / 4000));
      }
      this.ringValue = Math.min(90, p);
      ring.setProgress(this.reduced ? Math.round(this.ringValue / 10) * 10 : this.ringValue);
      this.ringRaf = requestAnimationFrame(step);
    };
    this.ringRaf = requestAnimationFrame(step);
  }

  /** Waits out the 700ms minimum so a fast answer never flickers. */
  async ringEnd(ok: boolean) {
    const ring = this.ring;
    const elapsed = performance.now() - this.ringStart;
    if (elapsed < RING_MIN_VISIBLE_MS) await sleep(RING_MIN_VISIBLE_MS - elapsed);
    cancelAnimationFrame(this.ringRaf);
    if (!ring) return;
    if (ok) {
      /* From the spinning arc (passkey, Google) into a real, closing one. */
      ring.setMode("progress");
      if (this.reduced) {
        ring.setProgress(100);
      } else {
        const from = this.ringValue;
        const start = performance.now();
        await new Promise<void>((resolve) => {
          const step = (now: number) => {
            const k = Math.min(1, (now - start) / 260);
            ring.setProgress(from + (100 - from) * (1 - Math.pow(1 - k, 3)));
            if (k < 1) this.ringRaf = requestAnimationFrame(step);
            else resolve();
          };
          this.ringRaf = requestAnimationFrame(step);
        });
      }
      ring.setMode("complete");
    } else {
      ring.setMode("drain");
      ring.setProgress(0);
      await sleep(this.reduced ? 0 : 420);
      ring.setMode("hidden");
    }
  }

  ringIndeterminate() {
    cancelAnimationFrame(this.ringRaf);
    this.ringStart = performance.now();
    this.ring?.setMode("indeterminate");
  }

  ringHide() {
    cancelAnimationFrame(this.ringRaf);
    this.ring?.setMode("hidden");
  }

  /* -------------------------------------------------------------- greeting */

  /**
   * Addresses the greeting to `name`, in whichever language is on screen at
   * that moment: the one the person happened to be looking at when they
   * finished typing their email.
   */
  personalise(name: string | null) {
    if (this.greeting.name === name) return;
    this.greeting = { ...this.greeting, name, lang: name ? this.currentLang?.lang ?? "English" : null };
    this.emit();
  }

  /** A returning visitor: straight to their name, in the language they last saw. */
  restoreGreeting(name: string, lang: string) {
    this.greeting = { ...this.greeting, name, lang };
    this.emit();
  }

  forgetGreeting() {
    this.greeting = { ...this.greeting, name: null, lang: null };
    this.emit();
  }

  /** The one-line version for the collapsed mobile band. */
  setLine(line: string) {
    if (this.greeting.line === line) return;
    this.greeting = { ...this.greeting, line };
    this.emit();
  }

  /** The orb's centre on screen, for the success zoom. */
  orbCentre() {
    const box = this.orbBox?.getBoundingClientRect();
    if (!box || !box.width) return null;
    return { x: box.left + box.width / 2, y: box.top + box.height / 2, r: box.width / 2 };
  }

  destroy() {
    window.clearTimeout(this.moodTimer);
    cancelAnimationFrame(this.ringRaf);
    this.listeners.clear();
  }
}
