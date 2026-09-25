/** Two letters for a client's round mark: the first letter of each of the first two words. */
export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

/* One of five solid fills, chosen from the name so a client keeps its colour. */
export function avTone(name: string) {
  const tones = ["brand", "live", "good", "warn", "neutral"] as const;
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return tones[h % tones.length];
}
