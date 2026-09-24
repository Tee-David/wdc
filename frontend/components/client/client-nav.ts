import type { LucideIcon } from "lucide-react";
import { Banknote, FolderKanban, LayoutDashboard, LifeBuoy, Settings } from "lucide-react";

/**
 * THE PORTAL'S OWN NAV, five items -- the same array-as-single-source-of-
 * truth `components/admin/shell.tsx` already uses for `NAV`, sized to
 * AGENTS.md's "no more than six primary pages" rule with one to spare.
 */
export type ClientNavItem = { href: string; label: string; Icon: LucideIcon; tour: string };

export const CLIENT_NAV: ClientNavItem[] = [
  { href: "/portal", label: "Overview", Icon: LayoutDashboard, tour: "portal-nav-overview" },
  { href: "/portal/projects", label: "Projects", Icon: FolderKanban, tour: "portal-nav-projects" },
  { href: "/portal/billing", label: "Billing", Icon: Banknote, tour: "portal-nav-billing" },
  { href: "/portal/support", label: "Support", Icon: LifeBuoy, tour: "portal-nav-support" },
  { href: "/portal/settings", label: "Settings", Icon: Settings, tour: "portal-nav-settings" },
];

export function isClientNavActive(href: string, path: string) {
  return href === "/portal" ? path === href : path.startsWith(href);
}
