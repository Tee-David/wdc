/** WDC Dashboard System: small helpers for prototypes and previews. The product renders these patterns in React with the same class names and tokens. */
export interface WDC {
  /** Format Naira: ngn(850000) is "₦850,000". */
  ngn(amount: number): string;
  /** Short money for tiles and charts: short(4860000) is "₦4.86m". */
  short(amount: number): string;
  /** Count an element's number up from 0 over 1 second; the final text is always the real value. */
  countUp(el: HTMLElement, to: number, format?: (n: number) => string): void;
  /** The site's confetti, into a fixed layer element. 70 pieces, 44 on phones; does nothing under reduced motion. */
  confetti(layer: HTMLElement): void;
}
declare global { interface Window { WDC: WDC } }
