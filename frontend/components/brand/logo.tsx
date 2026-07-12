import { ACCENT_PATHS, INK_PATHS, LOGO_VIEWBOX } from "./logo-paths";

export type LogoTone = "auto" | "navy" | "orange" | "white" | "black";

const TONES: Record<Exclude<LogoTone, "auto">, { ink: string; accent: string }> = {
  navy: { ink: "#000065", accent: "#000065" },
  orange: { ink: "#FF6500", accent: "#FF6500" },
  white: { ink: "#ffffff", accent: "#ffffff" },
  black: { ink: "#0e0e0e", accent: "#0e0e0e" },
};

function toneColors(tone: LogoTone) {
  // "auto" keeps the two-color mark and follows the theme:
  // navy ink in light mode, white ink in dark mode, orange nib always.
  if (tone === "auto") return { ink: "var(--logo-ink)", accent: "#FF6500" };
  return TONES[tone];
}

export function WdcMark({
  tone = "auto",
  className,
}: {
  tone?: LogoTone;
  className?: string;
}) {
  const { ink, accent } = toneColors(tone);
  return (
    <svg
      viewBox={LOGO_VIEWBOX}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <g fill={ink}>
        {INK_PATHS.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      <g fill={accent}>
        {ACCENT_PATHS.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </svg>
  );
}

export function Logo({
  tone = "auto",
  className,
  markClassName = "h-9 w-auto",
}: {
  tone?: LogoTone;
  className?: string;
  markClassName?: string;
}) {
  const { ink } = toneColors(tone);
  return (
    <span className={`inline-flex items-center gap-2 select-none ${className ?? ""}`}>
      <WdcMark tone={tone} className={markClassName} />
      <span
        className="font-heading font-bold leading-[0.95] tracking-tight text-[1.05rem]"
        style={{ color: ink }}
      >
        We Dig
        <br />
        Creativity
      </span>
      <span className="sr-only">We Dig Creativity — WDC Solutions</span>
    </span>
  );
}
