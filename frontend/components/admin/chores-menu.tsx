"use client";

import { Download, FileText, Layers, Mail, Plus, Settings, Upload, Users, ExternalLink, Trash2, Image as ImageIcon, LifeBuoy, type LucideIcon } from "lucide-react";
import { RowMenu, type RowMenuItem } from "./row-menu";

/**
 * THE ⋮ IN A PAGE HEAD: the chores that are not the page's one action. Links
 * only (a chore that is a form lives on its own page). The page passes plain
 * data, with the icon by name, because a server page cannot hand a component
 * to a client one.
 */
const ICONS: Record<string, LucideIcon> = {
  download: Download, file: FileText, layers: Layers, mail: Mail, plus: Plus, settings: Settings, upload: Upload,
  users: Users, open: ExternalLink, trash: Trash2, image: ImageIcon, support: LifeBuoy,
};
export type Chore = { label: string; href: string; icon?: keyof typeof ICONS; external?: boolean };

export function ChoresMenu({ items, label }: { items: Chore[]; label: string }) {
  const rows: RowMenuItem[] = items.map((c) => ({ kind: "link", label: c.label, href: c.href, icon: c.icon ? ICONS[c.icon] : undefined, external: c.external }));
  return <RowMenu items={rows} label={label} />;
}
