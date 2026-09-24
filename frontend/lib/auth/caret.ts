let context: CanvasRenderingContext2D | null = null;

/**
 * Where the caret is on screen, for the orb to read along.
 *
 * An <input> will not say where its caret is drawn, so this measures the text
 * before the caret with the input's own font on an offscreen canvas and adds
 * the padding, less however far the field has scrolled. Clamped inside the
 * field, because the orb should look at the field, not past it.
 */
export function caretPoint(input: HTMLInputElement): { x: number; y: number } {
  const rect = input.getBoundingClientRect();
  const style = window.getComputedStyle(input);
  if (!context) context = document.createElement("canvas").getContext("2d");
  const before = input.value.slice(0, input.selectionStart ?? input.value.length);
  let width = 0;
  if (context) {
    context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    width = context.measureText(before).width;
  }
  const left = rect.left + parseFloat(style.paddingLeft || "0");
  const right = rect.right - parseFloat(style.paddingRight || "0");
  const x = Math.min(right, Math.max(left, left + width - input.scrollLeft));
  return { x, y: rect.top + rect.height / 2 };
}
