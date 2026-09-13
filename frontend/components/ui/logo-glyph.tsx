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
      {/* IN MONO THIS IS AN OUTLINE, NOT A FILLED BLOCK.

          These badges stand in for the marks simple-icons removed on trademark
          grounds, so they sit in rows next to real icons. A real icon in mono
          fills its PATH with currentColor and reads as a glyph. This used to
          fill the whole 24x24 rect with currentColor and knock the letters out
          in `--background`, which at 20-something pixels is not a monogram, it
          is a solid square -- and that is exactly how LinkedIn and OpenAI were
          being reported: "boxes" sitting among the logos.

          Outlined, with the letters in the same ink, it carries the same visual
          weight as the glyphs beside it and stays legible in both themes,
          because both the stroke and the text follow currentColor rather than
          one of them following the page background. */}
      <rect
        x={mono ? 0.9 : 0}
        y={mono ? 0.9 : 0}
        width={mono ? 22.2 : 24}
        height={mono ? 22.2 : 24}
        rx={mono ? 5 : 5.5}
        fill={mono ? "none" : entry.bg}
        stroke={mono ? "currentColor" : "none"}
        strokeWidth={mono ? 1.7 : 0}
      />
      <text
        x="12"
        y="12.5"
        dominantBaseline="central"
        textAnchor="middle"
        fontFamily="var(--font-space-grotesk), sans-serif"
        fontWeight="700"
        fontSize={entry.label.length > 2 ? 8 : 11}
        fill={mono ? "currentColor" : entry.fg}
      >
        {entry.label}
      </text>
    </svg>
  );
}

export { logoHex };
