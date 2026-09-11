import "./animated-testimonials.css";

export interface Testimonial {
  description: string;
  name: string;
  handle: string;
  /** Optional avatar URL; falls back to an initials badge when absent. */
  image?: string;
}

/* Two letters, from words that actually start with one. Real client names
   carry punctuation as separate tokens -- "TAB — The Ajoks Brand", "Millcon &
   Millcon Consult Limited" -- and taking the first character of the first two
   space-separated tokens produced badges reading "T—" and "M&". Filtering to
   tokens that begin with a letter or digit gives "TT" and "MM".

   A one-word name takes its own first two characters rather than a single
   letter, so "TraxStaff" is "TR" and every badge in the row is the same
   width. */
function initials(name: string) {
  const words = name.split(/\s+/).filter((w) => /^[\p{L}\p{N}]/u.test(w));
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Deterministic brand-tinted avatar backing from the name. */
const AVATAR_BG = ["#000065", "#FF6500", "#2323a8", "#0b1a8c", "#5a2ea6"];
function avatarBg(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_BG[h % AVATAR_BG.length];
}

function QuoteMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="h-7 w-7 text-secondary"
    >
      <path d="M9.9 6C6.6 7.6 4.8 10.3 4.8 13.9V18h5.3v-5H7.4c0-2 1-3.4 3-4.4L9.9 6Zm9 0c-3.3 1.6-5.1 4.3-5.1 7.9V18h5.3v-5h-2.7c0-2 1-3.4 3-4.4L18.9 6Z" />
    </svg>
  );
}

function Avatar({ t }: { t: Testimonial }) {
  if (t.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={t.image}
        alt={t.name}
        loading="lazy"
        className="h-10 w-10 rounded-full object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white"
      style={{ background: avatarBg(t.name) }}
    >
      {initials(t.name)}
    </span>
  );
}

function Card({ t }: { t: Testimonial }) {
  return (
    <figure className="tm-card flex w-[320px] shrink-0 flex-col rounded-3xl border border-white/90 bg-white p-6 shadow-[0_10px_30px_-16px_rgba(0,0,101,0.4)] dark:border-line dark:bg-surface dark:shadow-[0_10px_30px_-16px_rgba(0,0,101,0.35)] sm:w-[360px]">
      <QuoteMark />
      <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-primary/60 dark:text-muted">
        {t.description}
      </blockquote>
      <figcaption className="mt-5 flex items-center gap-3">
        <Avatar t={t} />
        <span className="flex flex-col">
          <span className="text-sm font-semibold text-primary dark:text-foreground">
            {t.name}
          </span>
          <span className="text-xs text-primary/50 dark:text-muted">{t.handle}</span>
        </span>
      </figcaption>
    </figure>
  );
}

function MarqueeRow({
  items,
  duration,
  reverse = false,
}: {
  items: Testimonial[];
  duration: number;
  reverse?: boolean;
}) {
  // Duplicate the set so the -50% translate loops seamlessly.
  const doubled = [...items, ...items];
  return (
    <div className="tm-marquee">
      <div
        className={`tm-track ${reverse ? "tm-track--reverse" : ""}`}
        style={{ ["--tm-duration" as string]: `${duration}s` }}
      >
        {doubled.map((t, i) => (
          <div key={i} className="tm-item" aria-hidden={i >= items.length}>
            <Card t={t} />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * ScrollX-UI-style testimonial wall: two auto-scrolling rows (opposite
 * directions) of quote cards that pause on hover, fade at the edges, and
 * fall back to a static wrap under reduced motion. On-brand (navy/orange),
 * light + dark, with initials-badge avatars when no photo is supplied.
 */
export function AnimatedTestimonials({
  data,
  speed = 46,
}: {
  data: Testimonial[];
  speed?: number;
}) {
  const half = Math.ceil(data.length / 2);
  const rowA = data.slice(0, half);
  const rowB = data.slice(half);
  const secondRow = rowB.length ? rowB : rowA;
  return (
    <div className="flex flex-col gap-5">
      <MarqueeRow items={rowA} duration={speed} />
      <MarqueeRow items={secondRow} duration={speed * 1.18} reverse />
    </div>
  );
}

export default AnimatedTestimonials;
