import { MessageCircle } from "lucide-react";
import { whatsappLink } from "@/lib/admin/whatsapp";
import { CONTACT_EMAIL } from "@/lib/site";

/**
 * The line under every screen: a person is one tap away, and what we will
 * never ask for (plans/onboarding-ux-research.md, F).
 *
 * The WhatsApp button only exists when the studio's number is set in
 * NEXT_PUBLIC_STUDIO_WHATSAPP. It is never guessed or invented. The message is
 * drafted for the client to press send on themselves, and carries the service,
 * the business and the name so a reply does not start from nothing. The email
 * link is always there.
 */
export default function HelpStrip({ service, company, name }: { service: string; company: string; name: string }) {
  const number = process.env.NEXT_PUBLIC_STUDIO_WHATSAPP ?? "";
  const who = [name, company].filter(Boolean).join(", ");
  const text = `Hello, I am filling in the ${service} brief${who ? ` (${who})` : ""} and I would like to talk to someone.`;
  const wa = number ? whatsappLink(number, text) : null;
  return (
    <div className="ob__help">
      <p>
        <b>Prefer to talk?</b>{" "}
        {wa ? <a href={wa} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden="true" /> Message us on WhatsApp</a> : null}
        {wa ? " or " : null}
        <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`${service} brief`)}`}>email us</a>. Your answers are saved.
      </p>
      <p className="ob__never">We never ask for passwords, PINs, OTP codes, BVN or card numbers.</p>
    </div>
  );
}
