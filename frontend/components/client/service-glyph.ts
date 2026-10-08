import { createElement } from "react";
import { FolderKanban } from "lucide-react";
import { SERVICE_BY_SLUG, type ServiceSlug } from "@/lib/services";
import { SERVICE_ICONS } from "@/components/ui/service-icons";
import { iconTileStyle, isProjectIcon, PROJECT_ICONS } from "@/lib/project-icons";

/** A project's service as its icon, or a folder when the service has none. */
export function serviceGlyph(slug: ServiceSlug) {
  const service = SERVICE_BY_SLUG.get(slug);
  return createElement((service && SERVICE_ICONS[service.icon]) || FolderKanban, { "aria-hidden": true });
}

/** A project's own icon (lib/project-icons.ts), else its service's. */
export function projectGlyph(project: { icon?: string; service: ServiceSlug }) {
  if (isProjectIcon(project.icon)) return createElement(PROJECT_ICONS[project.icon].icon, { "aria-hidden": true });
  return serviceGlyph(project.service);
}

/** The colour of a project's icon tile, or undefined for the tile's default look. */
export function projectTileStyle(project: { iconColor?: string }) {
  return iconTileStyle(project.iconColor);
}
