/**
 * PAYSTACK COUNTS IN KOBO, AND SO DO OUR BOOKS (lib/admin/store.ts keeps every
 * amount in kobo; `naira()` divides by 100 only to display it). So nothing is
 * converted at this boundary, only rounded to a whole kobo. It used to
 * multiply on the way out and divide on the way in, as if the books were in
 * naira: a ₦500 balance opened a ₦50,000 checkout, and a payment would have
 * been banked at a hundredth of itself.
 */
export const wholeKobo = (kobo: number) => Math.round(kobo);
