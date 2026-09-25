/**
 * THE ONE PASSWORD RULE, read by the forms that ask for a new password and by
 * the server that stores it: at least eight characters, with a capital, a
 * small letter, a number and a symbol (the owner's rule, 2026-09-25).
 *
 * The forms use it to tick the checklist as someone types; the server uses it
 * to refuse anything that got past a form, because a form is a suggestion and
 * the endpoint is the rule.
 */
export const PASSWORD_MIN = 8;

export const PASSWORD_RULES = [
  { id: "length", label: `${PASSWORD_MIN}+ characters`, hint: `Use ${PASSWORD_MIN} or more characters`, test: (p: string) => p.length >= PASSWORD_MIN },
  { id: "upper", label: "A capital", hint: "Add a capital letter", test: (p: string) => /\p{Lu}/u.test(p) },
  { id: "lower", label: "A small letter", hint: "Add a lowercase letter", test: (p: string) => /\p{Ll}/u.test(p) },
  { id: "number", label: "A number", hint: "Add a number", test: (p: string) => /\d/.test(p) },
  { id: "symbol", label: "A symbol", hint: "Add a symbol, like ! or #", test: (p: string) => /[^\p{L}\d\s]/u.test(p) },
] as const;

/**
 * Four bars and a word, for the meter under a new password, and the ONE
 * thing to do next. Every rule met is four bars; each missing rule costs one.
 */
export function passwordStrength(password: string): { bars: 0 | 1 | 2 | 3 | 4; word: string; next: string | null } {
  if (!password) return { bars: 0, word: "", next: null };
  const missing = PASSWORD_RULES.filter((r) => !r.test(password));
  const bars = (missing.length === 0 ? 4 : Math.max(1, 4 - missing.length)) as 1 | 2 | 3 | 4;
  const word = bars === 4 ? "Strong" : bars === 3 ? "Good" : bars === 2 ? "Fair" : "Weak";
  return { bars, word, next: missing[0]?.hint ?? null };
}

/** What is missing, as one sentence, or null when the password passes. */
export function passwordProblem(password: string): string | null {
  const missing = PASSWORD_RULES.filter((r) => !r.test(password));
  if (!missing.length) return null;
  if (missing.some((r) => r.id === "length")) return `Use at least ${PASSWORD_MIN} characters, with a capital, a small letter, a number and a symbol.`;
  const words = missing.map((r) => r.label.toLowerCase());
  return `Add ${words.length === 1 ? words[0] : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`}.`;
}

/**
 * A strong password for someone who would rather not invent one: sixteen
 * characters from the browser's own random source, with every rule met and
 * the look-alikes (0/O, 1/l/I) left out so it can be read off a screen.
 */
export function suggestPassword(length = 16): string {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!@#$%^&*-_=+?"];
  const all = sets.join("");
  const pick = (from: string) => {
    const n = new Uint32Array(1);
    crypto.getRandomValues(n);
    return from[n[0] % from.length];
  };
  const chars = [...sets.map(pick), ...Array.from({ length: length - sets.length }, () => pick(all))];
  for (let i = chars.length - 1; i > 0; i--) {
    const n = new Uint32Array(1);
    crypto.getRandomValues(n);
    const j = n[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
