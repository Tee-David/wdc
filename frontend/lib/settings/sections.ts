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
export type SettingsIcon = "sliders" | "messages" | "images" | "mail" | "plug" | "history" | "shield" | "users" | "user" | "globe" | "activity" | "lock" | "bell" | "wrench" | "building";

export type SettingsSection = {
  href: string;
  label: string;
  line: string;
  group: (typeof SETTINGS_GROUPS)[number];
  icon: SettingsIcon;
  /** Who may open it; null is anybody with an admin role (their own account). */
  area: Area | null;
  /** What the menu's search matches besides the label. */
  words: string;
};

export const SETTINGS_SECTIONS: SettingsSection[] = [
  { href: "/admin/settings/account", label: "My account", line: "Name, password and devices.", group: "You", icon: "user", area: null, words: "profile password sign in google devices sessions tours" },
  { href: "/admin/settings/general", label: "Studio and invoices", line: "VAT, payment terms and reminders.", group: "Studio", icon: "sliders", area: "settings", words: "vat payment due terms reminders invoices estimates finance defaults" },
  { href: "/admin/settings/business", label: "Business profile", line: "Registered details and social profiles.", group: "Studio", icon: "building", area: "settings", words: "business company legal registered bn cac name motto social linkedin instagram x twitter facebook tiktok youtube behance whatsapp profiles footer" },
  { href: "/admin/settings/meetings", label: "Meetings", line: "Availability, booking rules and calendar connections.", group: "Studio", icon: "bell", area: "settings", words: "cal calendar meetings booking schedule time zone availability reminders video google meet" },
  { href: "/admin/settings/notifications", label: "Notifications", line: "What the studio is emailed about.", group: "Studio", icon: "bell", area: "settings", words: "alerts email tickets payments forms entries" },
  { href: "/admin/settings/site", label: "Website and SEO", line: "Search results and indexing.", group: "Studio", icon: "globe", area: "settings", words: "seo search engines google index noindex description" },
  { href: "/admin/settings/maintenance", label: "Maintenance", line: "The holding page and who is waiting.", group: "Studio", icon: "wrench", area: "settings", words: "maintenance holding page offline down 503 back soon template preview notify waitlist reviewer link" },
  { href: "/admin/settings/email", label: "Email", line: "Sender, test send and the log.", group: "Studio", icon: "mail", area: "settings", words: "mail smtp sender from reply test failure alerts message log" },
  { href: "/admin/settings/content", label: "Blog and site copy", line: "Blog defaults, and what is set in code.", group: "Content", icon: "sliders", area: "content", words: "blog posts rss feed topic service default services work case studies legal testimonials copy" },
  { href: "/admin/settings/faq", label: "FAQ", line: "Questions on the site.", group: "Content", icon: "messages", area: "content", words: "questions answers" },
  { href: "/admin/settings/media", label: "Media library", line: "Pictures and files.", group: "Content", icon: "images", area: "content", words: "images pictures uploads files" },
  { href: "/admin/settings/users", label: "Users", line: "Invitations, access and account recovery.", group: "People", icon: "users", area: "team", words: "staff owner invite members access roles permissions" },
  { href: "/admin/settings/integrations", label: "Integrations", line: "Outside services and their state.", group: "System", icon: "plug", area: "settings", words: "paystack r2 storage database google pagespeed cal whatsapp" },
  { href: "/admin/settings/privacy", label: "Privacy and data", line: "Keep-for rules and requests.", group: "System", icon: "lock", area: "settings", words: "retention erase export requests ndpr gdpr" },
  { href: "/admin/settings/audit", label: "Audit log", line: "Every change and who made it.", group: "System", icon: "history", area: "settings", words: "history changes" },
  { href: "/admin/settings/system", label: "System health", line: "Services, schema and fix-it tools.", group: "System", icon: "activity", area: "settings", words: "services schema tools retry cache status" },
];

export const SETTINGS_GROUPS = ["You", "Studio", "Content", "People", "System"] as const;

/** A section matches a search on its label, its line or its words. */
export function sectionMatches(s: SettingsSection, q: string) {
  const needle = q.trim().toLowerCase();
  return !needle || `${s.label} ${s.line} ${s.words}`.toLowerCase().includes(needle);
}
