import { SERVICES, type ServiceSlug } from "@/lib/services";
import type { Faq } from "@/lib/faq";

/**
 * What an edited FAQ may contain. No `server-only`, so the spec can use it.
 *
 * Plain text only: the answers render as text and feed the FAQPage JSON-LD,
 * where markup would be both a rendering bug and a structured-data lie.
 */
export const FAQ_LIMITS = { items: 40, q: 200, a: 1_200 } as const;

export function parseFaqs(raw: unknown): { ok: true; faqs: Faq[] } | { ok: false; error: string } {
  let value = raw;
  if (typeof value === "string") {
    try { value = JSON.parse(value); } catch { return { ok: false, error: "The list could not be read." }; }
  }
  if (!Array.isArray(value)) return { ok: false, error: "The list could not be read." };
  const slugs = new Set<string>(SERVICES.map((s) => s.slug));
  const faqs: Faq[] = [];
  for (const item of value.slice(0, FAQ_LIMITS.items)) {
    if (!item || typeof item !== "object") continue;
    const q = typeof item.q === "string" ? item.q.replace(/\s+/g, " ").trim().slice(0, FAQ_LIMITS.q) : "";
    const a = typeof item.a === "string" ? item.a.replace(/\r\n/g, "\n").trim().slice(0, FAQ_LIMITS.a) : "";
    if (!q && !a) continue;
    if (!q || !a) return { ok: false, error: "Every question needs an answer, and every answer a question." };
    const services = Array.isArray(item.services)
      ? [...new Set(item.services.filter((s: unknown): s is ServiceSlug => typeof s === "string" && slugs.has(s)))] as ServiceSlug[]
      : [];
    faqs.push(services.length ? { q, a, services } : { q, a });
  }
  if (!faqs.length) return { ok: false, error: "Keep at least one question. To go back to what shipped, reset instead." };
  return { ok: true, faqs };
}
