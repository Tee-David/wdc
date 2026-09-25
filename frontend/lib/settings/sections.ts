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
export type SettingsIcon = "sliders" | "messages" | "images" | "mail" | "plug" | "history" | "shield";

export type SettingsSection = {
  href: string;
  label: string;
  line: string;
  group: "Studio" | "Communication" | "System";
  icon: SettingsIcon;
  area: Area;
};

export const SETTINGS_SECTIONS: SettingsSection[] = [
  { href: "/admin/settings/general", label: "Content and defaults", line: "What the site says, and the defaults for new invoices.", group: "Studio", icon: "sliders", area: "settings" },
  { href: "/admin/settings/faq", label: "FAQ", line: "The questions on the homepage, contact and service pages.", group: "Studio", icon: "messages", area: "content" },
  { href: "/admin/settings/media", label: "Media", line: "Pictures and files for the site and the blog.", group: "Studio", icon: "images", area: "content" },
  { href: "/admin/settings/email", label: "Email", line: "The mail server, a test send, and every message sent.", group: "Communication", icon: "mail", area: "settings" },
  { href: "/admin/settings/integrations", label: "Integrations", line: "Each outside service, and whether it is set up.", group: "System", icon: "plug", area: "settings" },
  { href: "/admin/settings/audit", label: "Audit log", line: "What changed, who changed it, and what it was.", group: "System", icon: "history", area: "settings" },
  { href: "/admin/settings/access", label: "Access", line: "The roles, and what each can do.", group: "System", icon: "shield", area: "settings" },
];

export const SETTINGS_GROUPS = ["Studio", "Communication", "System"] as const;
