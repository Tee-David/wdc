"use client";

import { useEffect, useRef } from "react";
import { useStage } from "./stage-context";
import type { OrbEngine, RingMode } from "./stage-store";
/* Type only: the shader module itself is loaded after first paint. */
import type { SuccessStyle } from "@/components/ui/live-orb";

/** Royal blue, brand orange, white: what the orb floods with on success. */
const SUCCESS_WASH = ["#3B3BFF", "#FF6500", "#FFFFFF"];

/**
 * WHAT THE ORB FLOODS TO WHEN SIGN-IN SUCCEEDS. Ember: the brand orange, lit
 * as a sphere. It replaced "mesh", a noise wash of blue, orange and white
 * that read as a texture sliding across the orb rather than the orb itself
 * lighting up. On the demo login, `?orb=eclipse|pearl|dusk|mesh` shows the
 * other candidates, so they can be compared in the real flow.
 */
const SUCCESS_STYLE: SuccessStyle = "ember";
function successStyle(): SuccessStyle {
  if (process.env.NEXT_PUBLIC_AUTH_DEMO !== "true") return SUCCESS_STYLE;
  const asked = new URLSearchParams(window.location.search).get("orb");
  const known: SuccessStyle[] = ["mesh", "ember", "eclipse", "pearl", "dusk"];
  return known.includes(asked as SuccessStyle) ? (asked as SuccessStyle) : SUCCESS_STYLE;
}

/**
 * THE CSS FACE, which is also the orb until WebGL arrives.
 *
 * It is in the server HTML at its final size, so there is no pop-in and no
 * layout shift when the engine loads, and it is the permanent orb on devices
 * that should not run a shader (no WebGL, two cores or fewer, Save-Data on).
 * Every mood has a CSS equivalent here: the gaze moves the eyes, `hold`
 * squashes them, turning away hides them, and success cross-fades the body.
 */
function cssEngine(box: HTMLElement): OrbEngine & { destroy(): void } {
  let turn = 0;
  let follow = false;
  const set = (name: string, value: number | string) => box.style.setProperty(name, String(value));
  const onMove = (event: PointerEvent) => {
    if (!follow) return;
    const rect = box.getBoundingClientRect();
    const dx = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2) / 3;
    const dy = (rect.top + rect.height / 2 - event.clientY) / (rect.height / 2) / 3;
    set("--lx", Math.max(-1, Math.min(1, dx)).toFixed(3));
    set("--ly", Math.max(-1, Math.min(1, dy)).toFixed(3));
  };
  window.addEventListener("pointermove", onMove, { passive: true });
  return {
    setLook(x, y) {
      set("--lx", x.toFixed(3));
      set("--ly", y.toFixed(3));
    },
    setTurn(radians) {
      turn = radians;
      box.dataset.turned = Math.abs(radians) > Math.PI / 2 ? "true" : "false";
    },
    setHold(value) {
      set("--hold", value.toFixed(3));
    },
    setMix(value) {
      set("--mix", value.toFixed(3));
    },
    setFollow(on) {
      follow = on;
    },
    blinkNow() {
      box.dataset.blink = "false";
      void box.offsetWidth;
      box.dataset.blink = "true";
    },
    turnNow: () => turn,
    destroy() {
      window.removeEventListener("pointermove", onMove);
    },
  };
}

/** Whether this device should be asked to run the shader at all. */
function shaderWelcome() {
  const cores = navigator.hardwareConcurrency ?? 4;
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  return cores > 2 && !saveData;
}

/**
 * The orb, its ring and its floor shadow, in one reserved box.
 *
 * `aria-hidden` throughout: everything the orb says is also said in text by
 * the form, so a screen reader loses nothing and is not asked to describe a
 * face.
 */
export function OrbStage({ className = "" }: { className?: string }) {
  const stage = useStage();
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ringRef = useRef<SVGSVGElement>(null);
  const arcRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    const canvas = canvasRef.current;
    const svg = ringRef.current;
    const arc = arcRef.current;
    if (!box || !canvas || !svg || !arc) return;

    stage.attachBox(box);
    stage.attachRing({
      setMode(mode: RingMode) {
        svg.dataset.mode = mode;
      },
      setProgress(value: number) {
        arc.style.strokeDashoffset = String(100 - value);
      },
    });

    const style = successStyle();
    box.dataset.success = style;
    const face = cssEngine(box);
    stage.attachEngine(face);

    let cancelled = false;
    let destroyGl: (() => void) | null = null;

    /* AFTER FIRST PAINT, and only on a device that should run it. The form is
       the page's largest paint and the reason anybody is here; the shader is
       decoration and waits its turn. */
    const load = async () => {
      if (cancelled || !shaderWelcome()) return;
      const { createLiveOrb } = await import("@/components/ui/live-orb");
      if (cancelled) return;
      const orb = createLiveOrb(canvas, {
        variant: "white",
        colors: SUCCESS_WASH,
        successStyle: style,
        interactive: false,
        blink: true,
        maxDpr: 1.5,
        onHasGl(ok) {
          if (ok) {
            /* Two frames, so the canvas has drawn before the face goes. */
            requestAnimationFrame(() => requestAnimationFrame(() => { box.dataset.gl = "on"; }));
          } else {
            box.dataset.gl = "off";
            stage.attachEngine(face);
          }
        },
      });
      if (!orb) return;
      destroyGl = () => orb.destroy();
      stage.attachEngine({
        setLook: orb.setLook,
        setTurn: orb.setTurn,
        setHold: orb.setHold,
        setMix: orb.setMix,
        setFollow: (on) => orb.setOptions({ interactive: on }),
        blinkNow: orb.blinkNow,
        turnNow: () => orb.current().turn,
      });
    };

    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(() => void load(), { timeout: 1200 })
      : window.setTimeout(() => void load(), 300);

    return () => {
      cancelled = true;
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle as number);
      else window.clearTimeout(idle as number);
      destroyGl?.();
      face.destroy();
      stage.attachEngine(null);
      stage.attachRing(null);
      if (stage.orbBox === box) stage.attachBox(null);
    };
  }, [stage]);

  return (
    <div ref={boxRef} className={`orb ${className}`} aria-hidden="true" data-gl="off">
      <span className="orb__floor" />
      <svg ref={ringRef} className="orb__ring" viewBox="0 0 100 100" data-mode="hidden" focusable="false">
        <circle className="orb__track" cx="50" cy="50" r="49" pathLength={100} />
        <circle ref={arcRef} className="orb__arc" cx="50" cy="50" r="49" pathLength={100} />
      </svg>
      <span className="orb__body">
        <span className="orb__face">
          <span className="orb__wash" />
          <span className="orb__eye orb__eye--l" />
          <span className="orb__eye orb__eye--r" />
        </span>
        <canvas ref={canvasRef} className="orb__canvas" />
      </span>
    </div>
  );
}
