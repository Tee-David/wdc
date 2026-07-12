import type { LogoEntry } from "@/lib/logos";
import { logoHex } from "@/lib/logos";

/**
 * Renders one tool logo: the official simple-icons glyph in its brand color,
 * or a branded monogram badge for marks not distributable via simple-icons.
 * Pass `mono` to tint the mark with the current text color instead
 * (used by the greyscale marquee).
 */
export function LogoGlyph({
  entry,
  mono = false,
  className = "h-6 w-6",
}: {
  entry: LogoEntry;
  mono?: boolean;
  className?: string;
}) {
  if (entry.kind === "si") {
    return (
      <svg
        viewBox="0 0 24 24"
        role="img"
        aria-label={entry.name}
        className={className}
        fill={mono ? "currentColor" : `#${entry.icon.hex}`}
      >
        <path d={entry.icon.path} />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label={entry.name}
      className={className}
    >
      <rect
        width="24"
        height="24"
        rx="5.5"
        fill={mono ? "currentColor" : entry.bg}
      />
      <text
        x="12"
        y="12.5"
        dominantBaseline="central"
        textAnchor="middle"
        fontFamily="var(--font-space-grotesk), sans-serif"
        fontWeight="700"
        fontSize={entry.label.length > 2 ? 8 : 11}
        fill={mono ? "var(--background)" : entry.fg}
      >
        {entry.label}
      </text>
    </svg>
  );
}

export { logoHex };
