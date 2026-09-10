/**
 * Selected work shown on the homepage and on /services.
 *
 * `cover` is a screenshot of the live site, captured after the page had
 * finished loading and its images had decoded, so no card shows a half-painted
 * hero or an unresolved slider.
 *
 * `services` drives the filter on /services. These tags are CONFIRMED by the
 * client, project by project, rather than inferred from the screenshots — the
 * deliverable can evidence design and web, but only WDC knows whether a given
 * engagement also included SEO, software or social. Adding a tag here updates
 * the filter, the counts and the per-service rails on their own; no component
 * changes. A service with nothing tagged renders an honest empty state rather
 * than borrowing another service's work.
 */
import type { ServiceSlug } from "./services";

export type Project = {
  name: string;
  sector: string;
  url: string;
  /** Screenshot of the live site. Optional: a project can be listed before its
      capture exists, and the card renders a branded panel instead of a broken
      image. Drop the file in and the panel is replaced with no code change. */
  cover?: string;
  /** A FULL-PAGE capture, used when the site refuses to be framed. The cover is
      one screenful; this one scrolls, so a blocked preview is still the whole
      page rather than its header. Optional — the cover is the fallback's
      fallback. */
  long?: string;
  services: ServiceSlug[];
};

export const PROJECTS: Project[] = [
  {
    name: "TraxStaff",
    /* Tagged across three services from what the repository actually contains:
       a Next.js dashboard and Fastify/Prisma API (web), a Tauri desktop client
       and an Expo mobile client (apps), and the product engineering behind all
       of it (software). It was tagged software-only, which left the Apps filter
       showing zero projects against a service we sell. */
    sector: "Time tracking for teams",
    url: "https://traxstaff.com/",
    cover: "/work/traxstaff.jpg",
    long: "/work/long/trax-desktop.jpg",
    services: ["web", "apps", "software"],
  },
  {
    name: "Litch Consulting",
    sector: "Modelling and data analytics",
    url: "https://litchconsulting.com/",
    cover: "/work/litchconsulting.jpg",
    services: ["branding", "web", "software"],
  },
  {
    name: "Realtors' Practice",
    sector: "Property data and listings",
    url: "https://realtorspractice.ng/",
    cover: "/work/realtorspractice.jpg",
    services: ["branding", "web", "software"],
  },
  {
    name: "Nomarc Projects",
    sector: "Construction hiring platform",
    url: "https://nomarcprojects.com/",
    cover: "/work/nomarcprojects.jpg",
    services: ["web", "software"],
  },
  {
    name: "Exambeta Travels & Tours",
    sector: "Education and mobility",
    url: "https://exambeta.com.ng/",
    cover: "/work/exambeta.jpg",
    services: ["branding", "web"],
  },
  {
    name: "Jomo Resource Center",
    sector: "Education and training",
    url: "https://jomorc.com/",
    cover: "/work/jomorc.jpg",
    services: ["branding", "web", "seo"],
  },
  {
    name: "Speak Up For A Change",
    sector: "Non-profit",
    url: "https://speakupforachange.org/",
    cover: "/work/speakupforachange.jpg",
    services: ["branding", "web", "social"],
  },
];
