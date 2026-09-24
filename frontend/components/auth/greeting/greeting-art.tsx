"use client";

import localFont from "next/font/local";
import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useGreetingState, useStage } from "@/components/auth/stage/stage-context";
import { byLang, GREETINGS, type Greeting } from "./greetings";
import { PEN_HELLO, PEN_XIN_CHAO, penLength, type PenWord } from "./pen-paths";
import { TextPainter } from "./text-painter";

/** The canvas the text words are drawn on; see ./text-painter.ts for why not SVG text. */
const PainterContext = createContext<TextPainter | null>(null);

/**
 * CAVEAT, SELF-HOSTED AND SUBSET, and only ever loaded by this module.
 *
 * `assets/fonts/Caveat-Bold-subset.woff2` is Caveat Bold (OFL, licence beside
 * it) cut down to Latin, Latin Extended-A, the combining marks and the four
 * Latin Extended Additional letters Yoruba and Igbo need (Ẹ ẹ Ọ ọ), with the
 * contextual alternates dropped: 29.6 KB. The whole module arrives after first
 * paint, and `preload: false` keeps the font out of the page's <head>, so
 * nobody signing in pays for handwriting before they can see the form.
 *
 * Non-Latin greetings use the device's own fonts and download nothing.
 */
const caveat = localFont({
  src: "../../../assets/fonts/Caveat-Bold-subset.woff2",
  weight: "700",
  display: "swap",
  preload: false,
});

const SYSTEM = 'system-ui, -apple-system, "Segoe UI", "Noto Sans", sans-serif';
const W = 460;
const H = 150;
/**
 * TALLER ON A PHONE. Beside the orb the greeting gets about 155px of width,
 * and in a 460x150 canvas a name had to share the height with the word:
 * "hello" shrank to 60% the moment it knew who you were. At 460x230 the word
 * keeps the size it had alone and the name takes a line of its own.
 */
const H_PHONE = 230;
const PHONE = "(max-width: 1023.98px)";
const onPhoneChange = (notify: () => void) => {
  const mq = window.matchMedia(PHONE);
  mq.addEventListener("change", notify);
  return () => mq.removeEventListener("change", notify);
};
const isPhone = () => window.matchMedia(PHONE).matches;
/* The server draws the desktop canvas; a phone corrects it before the word is drawn. */
const notPhone = () => false;

const HOLD_MS = 1600;
const FADE_MS = 350;
const STILL_MS = 4000;

/** Drawing time per method, in seconds, used to know when a word is finished. */
function drawSeconds(greeting: Greeting, named: boolean) {
  const pen = greeting.method === "pen-en" ? penLength(PEN_HELLO) : greeting.method === "pen-vi" ? penLength(PEN_XIN_CHAO) * PEN_SPEED_VI : 0;
  if (pen) return pen + (named ? 1.7 : 0);
  return greeting.method === "reveal" ? 1.2 : 1.7;
}

/* "xin chào" takes almost eight seconds at the original speed. Half of that
   still reads as handwriting and does not hold the cycle up. */
const PEN_SPEED_VI = 0.5;

function PenSvg({ word, speed, y, height }: { word: PenWord; speed: number; y: number; height: number }) {
  return (
    <svg x={0} y={y} width={W} height={height} viewBox={word.viewBox} preserveAspectRatio="xMidYMid meet" overflow="visible">
      {word.strokes.map((stroke, i) => (
        <path
          key={i}
          d={stroke.d}
          pathLength={1}
          className={`greet__pen${stroke.accent ? " greet__pen--accent" : ""}`}
          style={{
            animationDuration: `${stroke.duration * speed}s`,
            animationDelay: `${stroke.delay * speed}s`,
            animationTimingFunction: stroke.ease,
          }}
        />
      ))}
    </svg>
  );
}

/**
 * Text that fits the box: drawn at a generous size, measured once the face is
 * ready, and scaled down until it fits. Hidden until measured, so nobody sees
 * it jump.
 */
/**
 * A text word of the greeting, fitted to `maxWidth` and drawn on the canvas
 * over the SVG (never as SVG text: see ./text-painter.ts). Renders nothing
 * itself; it hands the word to the painter and takes it back on unmount.
 */
function FittedText({
  text,
  family,
  weight,
  y,
  size,
  maxWidth,
  dir,
  className,
  delay = 0,
}: {
  height?: number;
  text: string;
  family: string;
  weight: number;
  y: number;
  size: number;
  maxWidth: number;
  dir: "ltr" | "rtl";
  className: "greet__script" | "greet__reveal";
  delay?: number;
}) {
  const painter = useContext(PainterContext);
  useEffect(() => {
    if (!painter) return;
    return painter.add({ text, family, weight, y, size, maxWidth, dir, delay, kind: className === "greet__script" ? "script" : "reveal" });
  }, [painter, text, family, weight, y, size, maxWidth, dir, delay, className]);
  return null;
}

/** The site's display face: every name is set in it, whatever the greeting is written in. */
const GROTESK = "var(--font-space-grotesk), system-ui, sans-serif";

/**
 * THE NAME, ALWAYS IN SPACE GROTESK. It used to follow the greeting: Caveat
 * under a handwritten word, Space Grotesk under a non-Latin one, so the same
 * person's name looked like two different brands depending on the language.
 * The greeting is the flourish; the name is the site speaking.
 */
function Name({ name, y, size, delay, height }: { name: string; y: number; size: number; delay: number; height: number }) {
  return <FittedText text={name} family={GROTESK} weight={600} y={y} size={size} maxWidth={W * 0.8} dir="ltr" className="greet__reveal" delay={delay} height={height} />;
}

function Word({ greeting, name, phone }: { greeting: Greeting; name: string | null; phone: boolean }) {
  const isPen = greeting.method === "pen-en" || greeting.method === "pen-vi";
  const word = greeting.method === "pen-vi" ? PEN_XIN_CHAO : PEN_HELLO;
  const speed = greeting.method === "pen-vi" ? PEN_SPEED_VI : 1;
  const h = phone ? H_PHONE : H;
  /* The name appears as the word finishes: late in a pen stroke, straight after a reveal. */
  const nameDelay = isPen ? penLength(word) * speed * 0.8 : 0.9;

  if (phone) {
    /* ONE LAYOUT FOR EVERY LANGUAGE ON A PHONE: the greeting as large as the
       width allows on the top line, the name on the line under it, both
       centred on the same axis as the caption. Alone, the greeting sits in
       the middle of the canvas. */
    const top = name ? 0 : (H_PHONE - 150) / 2;
    const greetingLine = isPen ? (
      <PenSvg word={word} speed={speed} y={top + 4} height={142} />
    ) : greeting.method === "reveal" ? (
      <FittedText text={greeting.text} family={SYSTEM} weight={600} y={top + 108} size={96} maxWidth={W * 0.92} dir={greeting.dir} className="greet__reveal" height={h} />
    ) : (
      <FittedText text={greeting.text} family={caveat.style.fontFamily} weight={700} y={top + 118} size={124} maxWidth={W * 0.94} dir="ltr" className="greet__script" height={h} />
    );
    return (
      <>
        {greetingLine}
        {name ? <Name name={name} y={212} size={56} delay={nameDelay} height={h} /> : null}
      </>
    );
  }

  /* Wider screens: the same stack in the 460x150 canvas, word above name. */
  if (!name) {
    if (isPen) return <PenSvg word={word} speed={speed} y={4} height={H - 8} />;
    return greeting.method === "reveal" ? (
      <FittedText text={greeting.text} family={SYSTEM} weight={600} y={104} size={92} maxWidth={W * 0.9} dir={greeting.dir} className="greet__reveal" />
    ) : (
      <FittedText text={greeting.text} family={caveat.style.fontFamily} weight={700} y={112} size={118} maxWidth={W * 0.94} dir="ltr" className="greet__script" />
    );
  }
  return (
    <>
      {isPen ? (
        <PenSvg word={word} speed={speed} y={0} height={90} />
      ) : greeting.method === "reveal" ? (
        /* Non-Latin and right-to-left: two scripts or two directions never share a line. */
        <FittedText text={greeting.text} family={SYSTEM} weight={600} y={78} size={72} maxWidth={W * 0.9} dir={greeting.dir} className="greet__reveal" />
      ) : (
        <FittedText text={greeting.text} family={caveat.style.fontFamily} weight={700} y={80} size={96} maxWidth={W * 0.9} dir="ltr" className="greet__script" />
      )}
      <Name name={name} y={136} size={40} delay={nameDelay} height={H} />
    </>
  );
}

/**
 * THE HANDWRITTEN GREETING. It never stops cycling. Once it knows who you
 * are, your name sits under each word and the cycle restarts from the
 * language you last saw, then carries on through the rest. It used to stop
 * on that one language for good, which on a returning visit left a page
 * that looked frozen.
 */
export default function GreetingArt() {
  const stage = useStage();
  const { name, lang } = useGreetingState();
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [still, setStill] = useState(false);
  const phone = useSyncExternalStore(onPhoneChange, isPhone, notPhone);
  const [painter] = useState(() => new TextPainter(W, H, false));
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /* Learning a name (or being told it on arrival) jumps the cycle to that
     person's language; from there it carries on as before. Adjusted during
     render, the documented way to reset state from a changed input. */
  const anchor = name ? `${name}|${lang}` : "";
  const [anchoredTo, setAnchoredTo] = useState(anchor);
  if (anchoredTo !== anchor) {
    setAnchoredTo(anchor);
    if (name) setIndex(GREETINGS.indexOf(byLang(lang)));
  }
  const greeting = GREETINGS[index % GREETINGS.length]!;
  const key = `${greeting.lang}|${name ?? ""}|${phone ? "phone" : "wide"}`;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setStill(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    painter.attach(canvasRef.current);
    return () => painter.destroy();
  }, [painter]);
  useEffect(() => painter.configure(W, phone ? H_PHONE : H, still), [painter, phone, still]);

  /* Tell the stage what is on screen, so personalising picks this language
     and the collapsed band can say the same word in plain text. */
  useEffect(() => {
    stage.showing(greeting.lang, greeting.text, name ? `${greeting.text}, ${name}` : greeting.text);
  }, [stage, greeting, name]);

  /* The cycle. Named or not; pauses while the tab is hidden. */
  useEffect(() => {
    let timer = 0;
    const advance = () => {
      setLeaving(true);
      timer = window.setTimeout(() => {
        setLeaving(false);
        setIndex((i) => (i + 1) % GREETINGS.length);
      }, still ? 200 : FADE_MS);
    };
    const schedule = () => {
      window.clearTimeout(timer);
      if (document.hidden) return;
      /* A named word waits for its name to be written too. */
      const wait = still ? STILL_MS : drawSeconds(greeting, Boolean(name)) * 1000 + HOLD_MS;
      timer = window.setTimeout(advance, wait);
    };
    const onVisibility = () => (document.hidden ? window.clearTimeout(timer) : schedule());
    schedule();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [greeting, name, still]);

  return (
    <div className={`greet__art${still ? " is-still" : ""}`}>
      <PainterContext.Provider value={painter}>
        <div className={`greet__draw${leaving ? " is-leaving" : ""}`}>
          <svg
            key={key}
            className="greet__svg"
            viewBox={`0 0 ${W} ${phone ? H_PHONE : H}`}
            preserveAspectRatio="xMidYMid meet"
            overflow="visible"
            lang={greeting.lang === "English" ? "en" : undefined}
          >
            <Word greeting={greeting} name={name} phone={phone} />
          </svg>
          <canvas ref={canvasRef} className="greet__canvas" />
        </div>
      </PainterContext.Provider>
      {/* On a phone only the language shows: the name above already says
          "welcome back", and the long form wrapped to two ragged lines. */}
      <span className="greet__caption">
        {name ? <span className="greet__captionLead">Welcome back, in </span> : null}
        {greeting.lang}
      </span>
    </div>
  );
}
