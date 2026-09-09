/**
 * Selected work shown on the homepage and on /services.
 *
 * `cover` is a screenshot of the live site, captured after the page had
 * finished loading and its images had decoded, so no card shows a half-painted
 * hero or an unresolved slider.
 *
 * `services` drives the filter on /services. IT IS DELIBERATELY CONSERVATIVE:
 * every entry below is a live site WDC designed and built, so "web" and
 * "branding" are evidenced by the deliverable itself, but whether a given
 * client also bought SEO, an app, software or social is not something the
 * screenshot can tell us. Add the missing tags here as they are confirmed and
 * the filter, the counts and the per-service rails all update on their own —
 * no component changes needed. A service with nothing tagged yet renders an
 * honest empty state rather than borrowing another service's work.
 */
import type { ServiceSlug } from "./services";

export type Project = {
  name: string;
  sector: string;
  url: string;
  cover: string;
  services: ServiceSlug[];
};

export const PROJECTS: Project[] = [
  {
    name: "Litch Consulting",
    sector: "Modelling and data analytics",
    url: "https://litchconsulting.com/",
    cover: "/work/litchconsulting.jpg",
    services: ["branding", "web"],
  },
  {
    name: "Realtors' Practice",
    sector: "Property data and listings",
    url: "https://realtorspractice.ng/",
    cover: "/work/realtorspractice.jpg",
    services: ["branding", "web"],
  },
  {
    name: "Nomarc Projects",
    sector: "Construction hiring platform",
    url: "https://nomarcprojects.com/",
    cover: "/work/nomarcprojects.jpg",
    services: ["branding", "web"],
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
    services: ["branding", "web"],
  },
  {
    name: "Speak Up For A Change",
    sector: "Non-profit",
    url: "https://speakupforachange.org/",
    cover: "/work/speakupforachange.jpg",
    services: ["branding", "web"],
  },
];
