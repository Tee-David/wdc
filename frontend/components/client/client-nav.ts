import type { LucideIcon } from "lucide-react";
import { Banknote, FolderKanban, LayoutDashboard, LifeBuoy, Settings } from "lucide-react";

/**
 * THE PORTAL'S OWN NAV, five items -- the same array-as-single-source-of-
 * truth `components/admin/shell.tsx` already uses for `NAV`, sized to
 * AGENTS.md's "no more than six primary pages" rule with one to spare.
 */
export type ClientNavItem = { href: string; label: string; Icon: LucideIcon };

export const CLIENT_NAV: ClientNavItem[] = [
  { href: "/portal", label: "Overview", Icon: LayoutDashboard },
  { href: "/portal/projects", label: "Projects", Icon: FolderKanban },
  { href: "/portal/billing", label: "Billing", Icon: Banknote },
  { href: "/portal/support", label: "Support", Icon: LifeBuoy },
  { href: "/portal/settings", label: "Settings", Icon: Settings },
];

export function isClientNavActive(href: string, path: string) {
  return href === "/portal" ? path === href : path.startsWith(href);
}
