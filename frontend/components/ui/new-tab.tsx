/**
 * "(opens in a new tab)", for screen readers only.
 *
 * A link that opens elsewhere is safe and correct with `rel="noopener"`, but it
 * is silent: someone using a screen reader follows it and finds themselves in
 * a new window with no idea why, and the back gesture they reach for does not
 * work. Sighted readers get the same news from the arrow glyph next to the
 * label; this is the same news, said out loud.
 *
 * The leading space matters. Without it the announcement runs into the end of
 * the label as one word.
 */
export function NewTab() {
  return <span className="sr-only"> (opens in a new tab)</span>;
}

export default NewTab;
