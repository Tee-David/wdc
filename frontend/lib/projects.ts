/**
 * Selected work shown on /preview.
 *
 * `cover` is a screenshot of the live site, captured after the page had
 * finished loading and its images had decoded, so no card shows a half-painted
 * hero or an unresolved slider.
 */
export type Project = {
  name: string;
  sector: string;
  url: string;
  cover: string;
};

export const PROJECTS: Project[] = [
  {
    name: "Litch Consulting",
    sector: "Modelling and data analytics",
    url: "https://litchconsulting.com/",
    cover: "/work/litchconsulting.jpg",
  },
  {
    name: "Realtors' Practice",
    sector: "Property data and listings",
    url: "https://realtorspractice.ng/",
    cover: "/work/realtorspractice.jpg",
  },
  {
    name: "Nomarc Projects",
    sector: "Construction hiring platform",
    url: "https://nomarcprojects.com/",
    cover: "/work/nomarcprojects.jpg",
  },
  {
    name: "Exambeta Travels & Tours",
    sector: "Education and mobility",
    url: "https://exambeta.com.ng/",
    cover: "/work/exambeta.jpg",
  },
  {
    name: "Jomo Resource Center",
    sector: "Education and training",
    url: "https://jomorc.com/",
    cover: "/work/jomorc.jpg",
  },
  {
    name: "Speak Up For A Change",
    sector: "Non-profit",
    url: "https://speakupforachange.org/",
    cover: "/work/speakupforachange.jpg",
  },
];
