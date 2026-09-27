import { SOCIAL_LINKS } from "@/lib/site";

/**
 * THE STUDIO'S SOCIAL PROFILES, set by the owner in Settings > Business
 * profile (one `social.<network>` setting each) and drawn as the row of marks
 * in every email's footer (lib/email-templates.ts). `SOCIAL_LINKS` in
 * lib/site.ts is what shipped, and it is empty: nothing in the repo says what
 * our handles are, and a guessed address in every email is a link to
 * somebody else's account.
 *
 * Each address must be on that network's own domain, over https, so a typo
 * cannot put a stranger's site in the footer. WhatsApp also takes a phone
 * number, turned into its wa.me link.
 */

export type Network = (typeof SOCIAL_LINKS)[number]["network"];

export const NETWORKS: { network: Network; label: string; hosts: string[]; example: string }[] = [
  { network: "linkedin", label: "LinkedIn", hosts: ["linkedin.com"], example: "https://www.linkedin.com/company/…" },
  { network: "instagram", label: "Instagram", hosts: ["instagram.com"], example: "https://www.instagram.com/…" },
  { network: "x", label: "X", hosts: ["x.com", "twitter.com"], example: "https://x.com/…" },
  { network: "facebook", label: "Facebook", hosts: ["facebook.com", "fb.com"], example: "https://www.facebook.com/…" },
  { network: "tiktok", label: "TikTok", hosts: ["tiktok.com"], example: "https://www.tiktok.com/@…" },
  { network: "youtube", label: "YouTube", hosts: ["youtube.com", "youtu.be"], example: "https://www.youtube.com/@…" },
  { network: "behance", label: "Behance", hosts: ["behance.net"], example: "https://www.behance.net/…" },
  { network: "whatsapp", label: "WhatsApp", hosts: ["wa.me", "whatsapp.com"], example: "+234 803 555 0142, or a wa.me link" },
];

export const socialKey = (network: Network) => `social.${network}`;

export const shippedSocial = (network: Network) => SOCIAL_LINKS.find((l) => l.network === network)?.url ?? "";

/** One network's address, checked; empty means "none". */
export function parseSocial(network: Network) {
  const def = NETWORKS.find((n) => n.network === network)!;
  return (raw: string): { ok: true; value: string } | { ok: false; error: string } => {
    const t = raw.trim();
    if (!t) return { ok: true, value: "" };
    if (network === "whatsapp" && /^\+?[\d\s()-]{7,20}$/.test(t)) {
      const digits = t.replace(/\D/g, "");
      if (digits.length < 8 || digits.length > 15) return { ok: false, error: "A phone number with its country code, like +234 803 555 0142." };
      return { ok: true, value: `https://wa.me/${digits}` };
    }
    let url: URL;
    try { url = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`); } catch { return { ok: false, error: `An address like ${def.example}` }; }
    const host = url.hostname.toLowerCase().replace(/^www\.|^m\./, "");
    if (!def.hosts.some((h) => host === h || host.endsWith(`.${h}`))) return { ok: false, error: `A ${def.label} address, like ${def.example}` };
    if (url.pathname === "/" || !url.pathname) return { ok: false, error: `The address of the studio's own page, like ${def.example}` };
    url.protocol = "https:";
    url.hash = "";
    const out = url.toString();
    if (out.length > 300) return { ok: false, error: "That address is too long." };
    return { ok: true, value: out };
  };
}

/** The profiles to draw, in NETWORKS order: a saved setting, else what shipped. */
export function socialLinks(read: (key: string) => string | null): { network: Network; label: string; url: string }[] {
  return NETWORKS.flatMap((n) => {
    const url = read(socialKey(n.network)) ?? shippedSocial(n.network);
    return url ? [{ network: n.network, label: n.label, url }] : [];
  });
}
