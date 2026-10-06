/** Lightweight shared normalization. Country-pattern validation stays in PhoneField's lazy library. */
export function normalizePhone(raw: string, country = "NG"): string | null {
  const text = raw.trim();
  if (!text) return "";
  if (!/^[+()\d\s.-]+$/.test(text)) return null;
  if (text.includes("+") && !/^\+[^+]*$/.test(text)) return null;
  let digits = text.replace(/\D/g, "");
  const nigeria = text.startsWith("+") ? digits.startsWith("234") : country === "NG";
  if (nigeria) {
    if (text.startsWith("+")) digits = digits.slice(3);
    if (/^0\d{10}$/.test(digits)) digits = digits.slice(1);
    return /^[1-9]\d{9}$/.test(digits) ? `+234${digits}` : null;
  }
  return text.startsWith("+") && /^[1-9]\d{3,14}$/.test(digits) ? `+${digits}` : null;
}
