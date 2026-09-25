import type { Area } from "@/lib/admin/permissions";

/**
 * The Settings sections, in the order the screen lists them.
 *
 * The Realtors Practice shape: grouped, each with an icon and one line, a
 * sidebar on a wide screen and a tappable list on a phone. Unlike RP, each
 * is its own page, so the phone's Back button goes back a section rather
 * than out of Settings. `area` is who may open it (lib/admin/permissions.ts);
 * a section a role cannot open is not listed for it, and its page refuses.
 */
export type SettingsIcon = "sliders" | "messages" | "images" | "mail" | "plug" | "history" | "shield" | "users" | "user" | "globe";

export type SettingsSection = {
  href: string;
  label: string;
  line: string;
  group: (typeof SETTINGS_GROUPS)[number];
  icon: SettingsIcon;
  /** Who may open it; null is anybody with an admin role (their own account). */
  area: Area | null;
};

export const SETTINGS_SECTIONS: SettingsSection[] = [
  { href: "/admin/settings/account", label: "My account", line: "Your name, password, sign-in methods and sessions.", group: "You", icon: "user", area: null },
  { href: "/admin/settings/general", label: "Content and defaults", line: "What the site says, and the defaults for new invoices.", group: "Studio", icon: "sliders", area: "settings" },
  { href: "/admin/settings/site", label: "Site and SEO", line: "The search description, and whether search engines may index the site.", group: "Studio", icon: "globe", area: "settings" },
  { href: "/admin/settings/faq", label: "FAQ", line: "The questions on the homepage, contact and service pages.", group: "Studio", icon: "messages", area: "content" },
  { href: "/admin/settings/media", label: "Media", line: "Pictures and files for the site and the blog.", group: "Studio", icon: "images", area: "content" },
  { href: "/admin/settings/team", label: "Team", line: "Who can reach the admin, invitations, roles and sessions.", group: "People", icon: "users", area: "team" },
  { href: "/admin/settings/email", label: "Email", line: "The mail server, a test send, and every message sent.", group: "Communication", icon: "mail", area: "settings" },
  { href: "/admin/settings/integrations", label: "Integrations", line: "Each outside service, and whether it is set up.", group: "System", icon: "plug", area: "settings" },
  { href: "/admin/settings/audit", label: "Audit log", line: "What changed, who changed it, and what it was.", group: "System", icon: "history", area: "settings" },
  { href: "/admin/settings/access", label: "Access", line: "The roles, and what each can do.", group: "System", icon: "shield", area: "settings" },
];

export const SETTINGS_GROUPS = ["You", "Studio", "People", "Communication", "System"] as const;
