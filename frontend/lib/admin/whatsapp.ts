/**
 * A link that opens WhatsApp on a client's number, and nothing more.
 *
 * `wa.me` is WhatsApp's own click-to-chat address: it opens the app (or the
 * web client) with the number and a draft message filled in, and the person
 * presses send themselves. The site sends nothing, reads nothing and learns
 * nothing about whether the message went, which is why the log beside it is
 * something a person fills in.
 *
 * NUMBERS ARE NIGERIAN UNLESS THEY SAY OTHERWISE, because the client list is.
 * A leading 0 becomes 234; a number already carrying a country code keeps it.
 * Anything too short to be a phone number gets no link rather than a wrong one.
 */
export function whatsappLink(phone: string, text?: string): string | null {
  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (phone.trim().startsWith("+")) {
    /* Already international. */
  } else if (digits.startsWith("0")) {
    digits = `234${digits.slice(1)}`;
  } else if (digits.length === 10) {
    digits = `234${digits}`;
  }
  if (digits.length < 11 || digits.length > 15) return null;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
