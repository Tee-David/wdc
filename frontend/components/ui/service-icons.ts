import {
  Accessibility, Activity, Archive, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BarChart3,
  Bell, Blender, BookOpen, BookOpenText, Bot, Boxes, BrainCircuit, Building2,
  Calculator, Calendar, CalendarClock, CheckCircle2, ClipboardList, Clock, Cloud, Code,
  Code2, Compass, Contact, Contrast, Copy, Cpu, CreditCard, Crosshair,
  Database, Edit, Eye, FileStack, FileText, Filter, Flag, FolderKanban,
  Gauge, GitBranch, Globe, Headphones, History, Home, House, Inbox,
  Keyboard, Layers, LayoutGrid, Leaf, Lighthouse, Link, Link2Off, Mail,
  Megaphone, Merge, MessageCircle, Monitor, MousePointerClick, Network, Orbit, Package,
  Palette, PanelLeft, PenTool, Phone, Plus, Quote, Receipt, RefreshCcw,
  RefreshCw, Reply, Rocket, RotateCcw, Route, Scale, Search, SearchCheck,
  Send, Server, Settings, Share2, ShieldCheck, Smartphone, Sparkles, Sprout,
  Store, Tablet, Tags, Target, TrendingUp, Upload, Users, Wallet,
  Webcam, Wrench, Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * EVERY ICON `ServiceIcon` CAN DRAW, BY NAME.
 *
 * The names arrive as strings from data (services, tours, the preview page),
 * which is why motion-icons-react looked them up in `import * as lucide`.
 * That one line shipped all ~1,500 lucide icons, 217KB gzipped, on every
 * page of the site: the root 404 renders the header, the header renders a
 * ServiceIcon, and Next loads the root 404's code on every route.
 *
 * Named imports instead, so the bundle holds these and nothing else.
 * tests/service-icons.spec.ts scans the source for icon names and fails if
 * one is used that is not listed here; a missing one also warns in the
 * console and renders nothing, which is what the package did.
 */
export const SERVICE_ICONS: Record<string, LucideIcon> = {
  Accessibility, Activity, Archive, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BarChart3,
  Bell, Blender, BookOpen, BookOpenText, Bot, Boxes, BrainCircuit, Building2,
  Calculator, Calendar, CalendarClock, CheckCircle2, ClipboardList, Clock, Cloud, Code,
  Code2, Compass, Contact, Contrast, Copy, Cpu, CreditCard, Crosshair,
  Database, Edit, Eye, FileStack, FileText, Filter, Flag, FolderKanban,
  Gauge, GitBranch, Globe, Headphones, History, Home, House, Inbox,
  Keyboard, Layers, LayoutGrid, Leaf, Lighthouse, Link, Link2Off, Mail,
  Megaphone, Merge, MessageCircle, Monitor, MousePointerClick, Network, Orbit, Package,
  Palette, PanelLeft, PenTool, Phone, Plus, Quote, Receipt, RefreshCcw,
  RefreshCw, Reply, Rocket, RotateCcw, Route, Scale, Search, SearchCheck,
  Send, Server, Settings, Share2, ShieldCheck, Smartphone, Sparkles, Sprout,
  Store, Tablet, Tags, Target, TrendingUp, Upload, Users, Wallet,
  Webcam, Wrench, Zap,
};
