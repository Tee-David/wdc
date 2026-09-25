import {
  BarChart3, Bot, Box, Briefcase, Building2, Camera, Car, Code2, Coffee, Cpu, Film, FolderKanban, Gem, Globe, GraduationCap,
  HeartPulse, Home, Layers, Leaf, Megaphone, Music, Palette, PenTool, Plane, Rocket, Search, Shirt, ShoppingBag, Smartphone,
  Store, Trophy, Utensils, type LucideIcon,
} from "lucide-react";

/**
 * THE ICONS A PROJECT CAN WEAR (the owner's ask: an icon per project, picked
 * or random, shown to the client too). A closed set, named, so the server can
 * refuse anything else and the portal draws the same one.
 */
export const PROJECT_ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  palette: { icon: Palette, label: "Palette" },
  pen: { icon: PenTool, label: "Pen" },
  layers: { icon: Layers, label: "Layers" },
  gem: { icon: Gem, label: "Gem" },
  globe: { icon: Globe, label: "Globe" },
  code: { icon: Code2, label: "Code" },
  phone: { icon: Smartphone, label: "Phone" },
  cpu: { icon: Cpu, label: "Chip" },
  bot: { icon: Bot, label: "Bot" },
  search: { icon: Search, label: "Search" },
  chart: { icon: BarChart3, label: "Chart" },
  megaphone: { icon: Megaphone, label: "Megaphone" },
  rocket: { icon: Rocket, label: "Rocket" },
  trophy: { icon: Trophy, label: "Trophy" },
  camera: { icon: Camera, label: "Camera" },
  film: { icon: Film, label: "Film" },
  music: { icon: Music, label: "Music" },
  bag: { icon: ShoppingBag, label: "Shopping" },
  store: { icon: Store, label: "Shop" },
  box: { icon: Box, label: "Box" },
  briefcase: { icon: Briefcase, label: "Briefcase" },
  building: { icon: Building2, label: "Building" },
  home: { icon: Home, label: "Home" },
  school: { icon: GraduationCap, label: "School" },
  health: { icon: HeartPulse, label: "Health" },
  food: { icon: Utensils, label: "Food" },
  coffee: { icon: Coffee, label: "Coffee" },
  leaf: { icon: Leaf, label: "Leaf" },
  fashion: { icon: Shirt, label: "Fashion" },
  car: { icon: Car, label: "Car" },
  travel: { icon: Plane, label: "Travel" },
};

export const PROJECT_ICON_NAMES = Object.keys(PROJECT_ICONS);

export function isProjectIcon(v: unknown): v is string {
  return typeof v === "string" && Object.hasOwn(PROJECT_ICONS, v);
}

export function randomProjectIcon(): string {
  return PROJECT_ICON_NAMES[Math.floor(Math.random() * PROJECT_ICON_NAMES.length)];
}

/** The icon to draw for a project: its own, else the folder. */
export function projectIconOf(name: string | undefined): LucideIcon {
  return (name && PROJECT_ICONS[name]?.icon) || FolderKanban;
}
