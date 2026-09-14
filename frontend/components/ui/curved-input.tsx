"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type SyntheticEvent
} from 'react';
import "./curved-input.css";

/**
 * An input bar bent along a circular arc: the border, the text, the caret and
 * the button all follow the curve.
 *
 * VENDORED FROM REACT BITS (`CurvedInput-TS-CSS`), not installed. The registry
 * item carries no dependencies -- it is two files -- and `npx shadcn add`
 * wants a `components.json` this project does not have and does not need one
 * of. So the source lives here, where it can be read and corrected, which is
 * what the rest of this change does.
 *
 * HOW IT WORKS, because the trick is worth knowing before editing it: nothing
 * you can see is a DOM input. The visible bar is one SVG -- the border is a
 * path, the text and the button label ride `<textPath>` along that arc, and
 * the caret is a rotated line. The real `<input>` sits on top at zero opacity
 * holding the value, the focus and the selection, so the keyboard, IME, the
 * mobile keyboard and screen readers all behave normally. Clicking the curve
 * focuses it and drops the caret on the nearest character, measured in arc
 * length rather than in pixels.
 *
 * WHAT WAS CHANGED FROM THE ORIGINAL, and why each one:
 *
 *   THE TOUCH-SCROLL TRAP. The original calls `preventDefault` on every
 *   `pointerdown` on the SVG, to stop a mouse press stealing focus from the
 *   hidden input. On a touch screen the same call cancels the browser's pan
 *   gesture for that pointer, so a finger put down on the bar could not
 *   scroll the page. In a FOOTER that is the one gesture everybody makes. It
 *   is now mouse-only -- a tap does not steal focus the way a press does.
 *   This is the identical fault the country picker had, from the identical
 *   line.
 *
 *   AUTOFILL. The original hard-codes `autoComplete="off"` and coerces
 *   `type="email"` to `"text"` (because `setSelectionRange` throws on an
 *   email input). Together that means a browser will not offer the visitor
 *   their own address -- on an email capture, which is the whole purpose.
 *   `autoComplete` is a prop now and this one asks for `email`.
 *
 *   A VISIBLE FOCUS RING. The button is an SVG `<g role="button">`, and the
 *   original marks focus by brightening its fill by 18%, which is not a focus
 *   indicator. It now draws a real ring.
 *
 *   REDUCED MOTION. The caret blinks with an SVG `<animate>`, which no media
 *   query reaches. It is switched off when the visitor has asked for less
 *   motion; the caret stays solid, which is what a caret is for anyway.
 *
 *   A BUSY STATE, so the form can lock itself while a submission is in
 *   flight rather than taking a second one.
 */

const DEG = 180 / Math.PI;

const round2 = (n: number): number => Math.round(n * 100) / 100;

const hexToRgba = (hex: string, alpha: number): string => {
  let h = String(hex).replace('#', '');
  if (h.length === 3)
    h = h
      .split('')
      .map(c => c + c)
      .join('');
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return hex;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

type ShadowSize = 'sm' | 'md' | 'lg';
type Theme = 'dark' | 'light';

const SHADOWS: Record<ShadowSize, [number, number, number]> = {
  sm: [5, 12, 0.3],
  md: [10, 24, 0.4],
  lg: [16, 40, 0.52]
};

interface ThemePalette {
  backgroundColor: string;
  textColor: string;
  placeholderColor: string;
  borderColor: string;
  buttonColor: string;
  buttonTextColor: string;
  shadowColor: string;
}

const THEMES: Record<Theme, ThemePalette> = {
  dark: {
    backgroundColor: '#1B1722',
    textColor: '#f5f5f5',
    placeholderColor: '#a1a1aa',
    borderColor: '#392e4e',
    buttonColor: '#A855F7',
    buttonTextColor: '#ffffff',
    shadowColor: '#000000'
  },
  light: {
    backgroundColor: '#ffffff',
    textColor: '#1d2050',
    placeholderColor: '#9aa0b6',
    borderColor: '#262a56',
    buttonColor: '#4763eb',
    buttonTextColor: '#ffffff',
    shadowColor: '#0b0e2a'
  }
};

interface Geometry {
  straight: boolean;
  W: number;
  T: number;
  svgH: number;
  R?: number;
  dir?: number;
  uPerLen: number;
  point: (u: number, v: number) => [number, number];
  angleAt: (u: number) => number;
  uFromPoint: (x: number, y?: number) => number;
}

// Maps the flat coordinate space (u: 0..W along the bar, v: offset from the
// centerline, positive down) onto a circular arc with the given sagitta
// (`bend`, in px). Positive bend arches up, negative sags down, 0 is flat.
const buildGeometry = (width: number, bend: number, thickness: number, pad: number): Geometry => {
  const W = width;
  const T = thickness;
  const s = Math.max(-W * 0.35, Math.min(bend, W * 0.35));
  const a = Math.abs(s);
  const dir = s >= 0 ? 1 : -1;
  const svgH = T + a + pad * 2;

  if (a < 0.75) {
    const midY = pad + T / 2;
    return {
      straight: true,
      W,
      T,
      svgH,
      uPerLen: 1,
      point: (u, v) => [u, midY + v],
      angleAt: () => 0,
      uFromPoint: x => x
    };
  }

  const R = (W * W * 0.25 + a * a) / (2 * a);
  const cx = W / 2;
  const apexY = pad + T / 2 + (dir > 0 ? 0 : a);
  const cy = apexY + dir * R;
  const phi = Math.asin(Math.min(1, W / (2 * R)));

  return {
    straight: false,
    W,
    T,
    svgH,
    R,
    dir,
    uPerLen: W / (2 * R * phi),
    point: (u, v) => {
      const th = ((u - cx) / cx) * phi;
      const rho = R - dir * v;
      return [cx + rho * Math.sin(th), cy - dir * rho * Math.cos(th)];
    },
    angleAt: u => dir * ((u - cx) / cx) * phi * DEG,
    uFromPoint: (x, y = 0) => {
      const th = Math.atan2(x - cx, dir * (cy - y));
      return cx + (th / phi) * cx;
    }
  };
};

const fmt = (g: Geometry, u: number, v: number): string => {
  const [x, y] = g.point(u, v);
  return `${round2(x)} ${round2(y)}`;
};

// Segment along a constant-v edge, as a circular arc (or a line when flat)
const edgeSeg = (g: Geometry, uTo: number, v: number, ltr: boolean): string => {
  if (g.straight) return `L ${fmt(g, uTo, v)}`;
  const rho = round2(g.R! - g.dir! * v);
  const sweep = ltr === g.dir! > 0 ? 1 : 0;
  return `A ${rho} ${rho} 0 0 ${sweep} ${fmt(g, uTo, v)}`;
};

// A rectangle bent along the arc: circular top/bottom edges, radial end caps
// and quadratic rounded corners.
const bentRectPath = (g: Geometry, u0: number, u1: number, vTop: number, vBot: number, radius: number): string => {
  const rc = Math.max(0, Math.min(radius, (vBot - vTop) / 2, (u1 - u0) / 2));
  return [
    `M ${fmt(g, u0 + rc, vTop)}`,
    edgeSeg(g, u1 - rc, vTop, true),
    `Q ${fmt(g, u1, vTop)} ${fmt(g, u1, vTop + rc)}`,
    `L ${fmt(g, u1, vBot - rc)}`,
    `Q ${fmt(g, u1, vBot)} ${fmt(g, u1 - rc, vBot)}`,
    edgeSeg(g, u0 + rc, vBot, false),
    `Q ${fmt(g, u0, vBot)} ${fmt(g, u0, vBot - rc)}`,
    `L ${fmt(g, u0, vTop + rc)}`,
    `Q ${fmt(g, u0, vTop)} ${fmt(g, u0 + rc, vTop)}`,
    'Z'
  ].join(' ');
};

const bentLinePath = (g: Geometry, u0: number, u1: number, v: number): string =>
  `M ${fmt(g, u0, v)} ${edgeSeg(g, u1, v, true)}`;

const SELECTABLE_TYPES = ['text', 'search', 'tel', 'url', 'password'];

interface CurvedInputProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  buttonText?: string;
  type?: string;
  name?: string;
  ariaLabel?: string;
  theme?: Theme;
  width?: number | string;
  bend?: number;
  height?: number;
  cornerRadius?: number;
  borderWidth?: number;
  fontSize?: number;
  backgroundColor?: string;
  textColor?: string;
  placeholderColor?: string;
  borderColor?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  iconColor?: string;
  shadowSize?: ShadowSize;
  shadowColor?: string;
  showButton?: boolean;
  showIcon?: boolean;
  icon?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Passed straight to the real input. Default "email" for an email field. */
  autoComplete?: string;
  /** Locks the control while a submission is in flight. */
  busy?: boolean;
}

/* One media query list for the whole module: every instance subscribes to the
   same object rather than each creating its own. */
const REDUCED = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  ? window.matchMedia('(prefers-reduced-motion: reduce)')
  : null;

function subscribeToReducedMotion(notify: () => void) {
  REDUCED?.addEventListener('change', notify);
  return () => REDUCED?.removeEventListener('change', notify);
}

function readReducedMotion() {
  return REDUCED?.matches ?? false;
}

const CurvedInput = ({
  value,
  defaultValue = '',
  onChange,
  onSubmit,
  placeholder = 'Enter your email',
  buttonText = 'Get Started',
  type = 'email',
  name,
  ariaLabel,
  theme = 'dark',
  width = 450,
  bend = 28,
  height = 64,
  cornerRadius = 18,
  borderWidth = 1.5,
  fontSize = 16,
  backgroundColor,
  textColor,
  placeholderColor,
  borderColor,
  buttonColor,
  buttonTextColor,
  iconColor,
  shadowSize = 'md',
  shadowColor,
  showButton = true,
  showIcon = true,
  icon,
  className = '',
  style,
  autoComplete,
  busy = false
}: CurvedInputProps) => {
  const uid = useId().replace(/:/g, '');
  const layoutPathId = `ci-text-${uid}`;
  const buttonPathId = `ci-btn-${uid}`;
  const clipId = `ci-clip-${uid}`;

  const rootRef = useRef<HTMLFormElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const textRef = useRef<SVGTextElement | null>(null);
  const btnMeasureRef = useRef<SVGTextElement | null>(null);
  const scrollRef = useRef(0);

  const [w, setW] = useState(0);
  const [innerValue, setInnerValue] = useState(defaultValue);
  const [caretIndex, setCaretIndex] = useState(defaultValue.length);
  const [focused, setFocused] = useState(false);
  const [caretU, setCaretU] = useState(0);
  const [scrollLen, setScrollLen] = useState(0);
  const [btnTextW, setBtnTextW] = useState(0);
  const [fontTick, setFontTick] = useState(0);

  const val = value !== undefined ? value : innerValue;
  const display = type === 'password' ? '•'.repeat(val.length) : val;

  const palette = THEMES[theme] || THEMES.dark;
  const bgColor = backgroundColor ?? palette.backgroundColor;
  const fgColor = textColor ?? palette.textColor;
  const phColor = placeholderColor ?? palette.placeholderColor;
  const strokeColor = borderColor ?? palette.borderColor;
  const accentColor = buttonColor ?? palette.buttonColor;
  const btnFgColor = buttonTextColor ?? palette.buttonTextColor;
  const shColor = shadowColor ?? palette.shadowColor;

  /* WHETHER THE CARET BLINKS. `useSyncExternalStore` rather than an effect,
     because this is a value the server cannot know, read on the client without
     the render-then-correct an effect would cause -- and unlike the platform
     probes elsewhere in this project it CAN change while the page is open, so
     it genuinely has something to subscribe to. Server snapshot is `false`,
     which matches the markup a non-reduced-motion visitor gets. */
  const stillCaret = useSyncExternalStore(subscribeToReducedMotion, readReducedMotion, () => false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const cw = entries[0]?.contentRect?.width ?? el.clientWidth;
      setW(Math.round(cw));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Re-measure once webfonts finish loading
  useEffect(() => {
    let alive = true;
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (alive) setFontTick(t => t + 1);
      });
    }
    return () => {
      alive = false;
    };
  }, []);

  const pad = Math.ceil(borderWidth / 2) + 6;
  const geom = useMemo<Geometry | null>(
    () => (w > 2 ? buildGeometry(w, bend, height, pad) : null),
    [w, bend, height, pad]
  );

  const layout = useMemo(() => {
    if (!geom) return null;
    const T = height;
    const btnInset = Math.max(5, borderWidth + 4);
    const chipH = Math.min(34, Math.max(16, T * 0.34));
    const chipW = chipH * 1.25;
    const iconU = 22 + chipW / 2;
    const textStartU = showIcon ? 22 + chipW + 13 : 24;
    const btnW = showButton ? Math.max(btnTextW + fontSize * 2.7, T * 1.35) : 0;
    const btnU1 = geom.W - btnInset;
    const btnU0 = btnU1 - btnW;
    const textEndU = Math.max(textStartU + 20, showButton ? btnU0 - 14 : geom.W - 24);
    const winLen = (textEndU - textStartU) / geom.uPerLen;
    return { btnInset, chipH, chipW, iconU, textStartU, textEndU, btnU0, btnU1, winLen };
  }, [geom, height, borderWidth, btnTextW, fontSize, showIcon, showButton]);

  /* Measure rendered text to keep the caret on the curve and scroll long
     values along the arc, exactly like a native input would.

     IT HAS A DEPENDENCY LIST NOW. The original ran on every render with none,
     which works -- both writes are guarded, so it settles -- but it leaves the
     hook rule warning permanently on, and a warning nobody can act on is a
     warning everybody learns to scroll past. The list is every input the
     measurement actually reads: the geometry and layout it measures against,
     the text and caret position it measures, the button label and size that
     set the button's width, and `fontTick`, which is the whole reason the
     font-load effect exists -- text measured before a webfont arrives is
     measured in the fallback. */
  useLayoutEffect(() => {
    if (btnMeasureRef.current) {
      const bw = btnMeasureRef.current.getComputedTextLength();
      setBtnTextW(prev => (Math.abs(prev - bw) > 0.5 ? bw : prev));
    }
    if (!geom || !layout) return;
    const textEl = textRef.current;
    const caret = Math.min(caretIndex, display.length);
    let caretLen = 0;
    let totalLen = 0;
    if (textEl && display.length) {
      try {
        totalLen = textEl.getSubStringLength(0, display.length);
        caretLen = caret > 0 ? textEl.getSubStringLength(0, caret) : 0;
      } catch {
        totalLen = 0;
        caretLen = 0;
      }
    }
    let next = scrollRef.current;
    if (caretLen - next > layout.winLen - 2) next = caretLen - layout.winLen + 2;
    if (caretLen - next < 0) next = caretLen;
    if (totalLen - next < layout.winLen) next = Math.max(0, totalLen - layout.winLen);
    next = Math.max(0, next);
    if (Math.abs(next - scrollRef.current) > 0.5) {
      scrollRef.current = next;
      setScrollLen(next);
    }
    setCaretU(layout.textStartU + (caretLen - next) * geom.uPerLen);
  }, [geom, layout, caretIndex, display, fontTick, buttonText, fontSize]);

  const commitValue = (v: string) => {
    if (value === undefined) setInnerValue(v);
    onChange?.(v);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    commitValue(e.target.value);
    setCaretIndex(e.target.selectionStart ?? e.target.value.length);
  };

  const handleSelect = (e: SyntheticEvent<HTMLInputElement>) => {
    const target = e.currentTarget;
    setCaretIndex(target.selectionStart ?? target.value.length);
  };

  const handleSubmit = (e?: FormEvent<HTMLFormElement>) => {
    if (e?.preventDefault) e.preventDefault();
    /* A second submit while the first is in flight is a duplicate row at the
       other end, so the guard is here rather than left to every caller. */
    if (busy) return;
    if (onSubmit) onSubmit(val);
  };

  // Click on the curve: focus the hidden input and drop the caret on the
  // character closest to the click, measured in arc length.
  const handleSurfaceClick = (e: ReactMouseEvent<SVGSVGElement>) => {
    const input = inputRef.current;
    if (!input) return;
    let idx = display.length;
    const svg = svgRef.current;
    const textEl = textRef.current;
    if (svg && geom && layout && textEl && display.length) {
      try {
        const ctm = svg.getScreenCTM();
        if (!ctm) throw new Error('missing screen CTM');
        const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
        const target = scrollRef.current + (geom.uFromPoint(pt.x, pt.y) - layout.textStartU) / geom.uPerLen;
        let best = 0;
        let bestDist = Infinity;
        for (let i = 0; i <= display.length; i++) {
          const li = i === 0 ? 0 : textEl.getSubStringLength(0, i);
          const d = Math.abs(li - target);
          if (d < bestDist) {
            bestDist = d;
            best = i;
          }
        }
        idx = best;
      } catch {
        idx = display.length;
      }
    }
    input.focus();
    try {
      input.setSelectionRange(idx, idx);
    } catch {
      /* selection API unavailable for this input type */
    }
    setCaretIndex(idx);
  };

  const safeType = SELECTABLE_TYPES.includes(type) ? type : 'text';
  const inputMode = type === 'email' ? 'email' : type === 'number' ? 'decimal' : undefined;

  const shadow = SHADOWS[shadowSize];
  const svgStyle: CSSProperties | undefined = shadow
    ? { filter: `drop-shadow(0 ${shadow[0]}px ${shadow[1]}px ${hexToRgba(shColor, shadow[2])})` }
    : undefined;

  let content: ReactNode = null;
  if (geom && layout) {
    const T = height;
    const vBase = fontSize * 0.34;
    const scrollU = scrollLen * geom.uPerLen;
    const bandPath = bentRectPath(geom, 0, geom.W, -T / 2, T / 2, cornerRadius);
    const layoutPath = bentLinePath(geom, layout.textStartU - scrollU, geom.W, vBase);
    const clipPath = bentRectPath(geom, layout.textStartU - 6, layout.textEndU + 8, -T / 2, T / 2, 0);

    const chipFill = iconColor || accentColor;
    const { chipW, chipH } = layout;
    const ew = chipW * 0.5;
    const eh = chipH * 0.5;
    const sw = Math.max(1.1, chipH * 0.075);
    const [ix, iy] = geom.point(layout.iconU, 0);
    const iconAngle = geom.angleAt(layout.iconU);

    const [caretX, caretY] = geom.point(caretU, 0);
    const caretAngle = geom.angleAt(caretU);
    const caretH = Math.min(T * 0.58, fontSize * 1.45);

    const btnH = T - layout.btnInset * 2;
    const buttonPath = showButton
      ? bentRectPath(
          geom,
          layout.btnU0,
          layout.btnU1,
          -T / 2 + layout.btnInset,
          T / 2 - layout.btnInset,
          Math.min(cornerRadius * 0.72, btnH / 2)
        )
      : '';
    const buttonTextPath = showButton ? bentLinePath(geom, layout.btnU0, layout.btnU1, vBase) : '';

    content = (
      <svg
        ref={svgRef}
        className="curved-input__svg"
        width={geom.W}
        height={round2(geom.svgH)}
        viewBox={`0 0 ${geom.W} ${round2(geom.svgH)}`}
        style={svgStyle}
        /* MOUSE ONLY. `preventDefault` here stops a press moving focus out of
           the hidden input before the click lands. On a touch screen the same
           call cancels the browser's pan gesture for that pointer, so a finger
           put down on the bar cannot scroll the page -- and this bar lives in
           a footer, which people scroll past constantly. A tap does not steal
           focus the way a press does, so touch does not need it. This is the
           identical fault the country picker had, from the identical line. */
        onPointerDown={e => { if (e.pointerType === 'mouse') e.preventDefault(); }}
        onClick={handleSurfaceClick}
      >
        <defs>
          <clipPath id={clipId}>
            <path d={clipPath} />
          </clipPath>
        </defs>

        <path
          className="curved-input__ring"
          d={bandPath}
          fill="none"
          stroke={accentColor}
          strokeWidth={borderWidth + 6}
        />
        <path d={bandPath} fill={bgColor} stroke={strokeColor} strokeWidth={borderWidth} />

        <path id={layoutPathId} d={layoutPath} fill="none" />

        {showIcon && (
          <g transform={`translate(${round2(ix)} ${round2(iy)}) rotate(${round2(iconAngle)})`} aria-hidden="true">
            {icon || (
              <>
                <rect x={-chipW / 2} y={-chipH / 2} width={chipW} height={chipH} rx={chipH * 0.27} fill={chipFill} />
                <rect
                  x={-ew / 2}
                  y={-eh / 2}
                  width={ew}
                  height={eh}
                  rx={1.4}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={sw}
                  strokeLinejoin="round"
                />
                <path
                  d={`M ${round2(-ew / 2)} ${round2(-eh / 2 + sw * 0.4)} L 0 ${round2(eh * 0.14)} L ${round2(ew / 2)} ${round2(-eh / 2 + sw * 0.4)}`}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={sw}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </>
            )}
          </g>
        )}

        <g clipPath={`url(#${clipId})`}>
          <text
            ref={textRef}
            style={{ fontSize: `${fontSize}px`, fontWeight: 500 }}
            fill={fgColor}
            xmlSpace="preserve"
            aria-hidden="true"
          >
            <textPath href={`#${layoutPathId}`}>{display}</textPath>
          </text>
          {!display && placeholder && (
            <text
              style={{ fontSize: `${fontSize}px`, fontWeight: 500 }}
              fill={phColor}
              xmlSpace="preserve"
              aria-hidden="true"
            >
              <textPath href={`#${layoutPathId}`}>{placeholder}</textPath>
            </text>
          )}
          {focused && (
            <g
              key={`${display}-${Math.min(caretIndex, display.length)}`}
              transform={`translate(${round2(caretX)} ${round2(caretY)}) rotate(${round2(caretAngle)})`}
            >
              {/* The blink is an SVG animation, which no CSS media query
                  reaches, so the preference is read in script instead. A
                  caret that does not blink is still a caret. */}
              <line y1={-caretH / 2} y2={caretH / 2} stroke={fgColor} strokeWidth="1.5" strokeLinecap="round">
                {stillCaret ? null : (
                  <animate
                    attributeName="opacity"
                    values="1;0"
                    dur="1.06s"
                    calcMode="discrete"
                    repeatCount="indefinite"
                  />
                )}
              </line>
            </g>
          )}
        </g>

        {showButton && (
          <g
            className="curved-input__button"
            role="button"
            tabIndex={0}
            aria-label={buttonText}
            onClick={e => {
              e.stopPropagation();
              handleSubmit();
            }}
            onPointerDown={(e: ReactPointerEvent<SVGGElement>) => e.stopPropagation()}
            onKeyDown={(e: KeyboardEvent<SVGGElement>) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSubmit();
              }
            }}
          >
            {/* A REAL RING, not a brightened fill. The original marks keyboard
                focus by raising the button's brightness 18%, which is not an
                indicator: it is invisible beside a hover, and invisible full
                stop to anyone comparing two shades of the same colour. */}
            <path className="curved-input__button-ring" d={buttonPath} fill="none" stroke={btnFgColor} strokeWidth={2} />
            <path className="curved-input__button-bg" d={buttonPath} fill={accentColor} />
            <path id={buttonPathId} d={buttonTextPath} fill="none" />
            <text
              fill={btnFgColor}
              textAnchor="middle"
              style={{ fontSize: `${fontSize}px`, fontWeight: 600, pointerEvents: 'none' }}
            >
              <textPath href={`#${buttonPathId}`} startOffset="50%">
                {buttonText}
              </textPath>
            </text>
          </g>
        )}

        <text
          ref={btnMeasureRef}
          style={{ fontSize: `${fontSize}px`, fontWeight: 600 }}
          x="-9999"
          y="-9999"
          visibility="hidden"
          aria-hidden="true"
        >
          {buttonText}
        </text>
      </svg>
    );
  }

  return (
    <form
      ref={rootRef}
      className={`curved-input ${focused ? 'curved-input--focused' : ''} ${busy ? 'curved-input--busy' : ''} ${className}`.trim()}
      style={{ width: typeof width === 'number' ? `${width}px` : width, ...style }}
      onSubmit={handleSubmit}
      noValidate
    >
      {content}
      <input
        ref={inputRef}
        className="curved-input__field"
        type={safeType}
        inputMode={inputMode}
        name={name}
        value={val}
        onChange={handleInputChange}
        onSelect={handleSelect}
        onKeyUp={handleSelect}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-label={ariaLabel || placeholder || 'Curved input'}
        /* NOT "off". A browser offering the visitor their own address is the
           difference between a subscribe box that gets used and one that gets
           abandoned, and this field exists to collect exactly that. */
        autoComplete={autoComplete ?? (type === 'email' ? 'email' : 'off')}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        disabled={busy}
      />
    </form>
  );
};

export default CurvedInput;
