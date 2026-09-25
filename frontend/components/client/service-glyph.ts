import { createElement } from "react";
import { FolderKanban } from "lucide-react";
import { SERVICE_BY_SLUG, type ServiceSlug } from "@/lib/services";
import { SERVICE_ICONS } from "@/components/ui/service-icons";

/** A project's service as its icon, or a folder when the service has none. */
export function serviceGlyph(slug: ServiceSlug) {
  const service = SERVICE_BY_SLUG.get(slug);
  return createElement((service && SERVICE_ICONS[service.icon]) || FolderKanban, { "aria-hidden": true });
}
