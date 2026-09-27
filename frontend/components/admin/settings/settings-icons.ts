import { Activity, Bell, Building2, Globe, History, Images, Lock, Mail, MessagesSquare, Plug, ShieldCheck, SlidersHorizontal, UserRound, Users, Wrench } from "lucide-react";
import type { SettingsIcon } from "@/lib/settings/sections";

/* One icon per section, shared by the section menu (a client component) and
   the overview (a server one), which is why it is not in either. */
export const SETTINGS_ICON: Record<SettingsIcon, typeof Mail> = {
  sliders: SlidersHorizontal, messages: MessagesSquare, images: Images, mail: Mail, plug: Plug, history: History,
  shield: ShieldCheck, users: Users, user: UserRound, globe: Globe, activity: Activity, lock: Lock, bell: Bell, wrench: Wrench, building: Building2,
};
