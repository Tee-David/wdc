import type { KitIconName } from "@/components/admin/side-kit";

/**
 * THE PORTAL'S OWN NAV, five items -- the same array-as-single-source-of-
 * truth `components/admin/shell.tsx` already uses for `NAV`, sized to
 * AGENTS.md's "no more than six primary pages" rule with one to spare.
 */
export type ClientNavItem = { href: string; label: string; icon: KitIconName; tour: string };

export const CLIENT_NAV: ClientNavItem[] = [
  { href: "/portal", label: "Home", icon: "home", tour: "portal-nav-overview" },
  { href: "/portal/projects", label: "Projects", icon: "folder", tour: "portal-nav-projects" },
  { href: "/portal/billing", label: "Billing", icon: "card", tour: "portal-nav-billing" },
  { href: "/portal/support", label: "Messages", icon: "msg", tour: "portal-nav-support" },
  { href: "/portal/settings", label: "Settings", icon: "gear", tour: "portal-nav-settings" },
];

export function isClientNavActive(href: string, path: string) {
  return href === "/portal" ? path === href : path.startsWith(href);
}
