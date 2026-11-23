/**
 * The teams whose work is on this site, for the "Trusted by teams at" row
 * under the hero.
 *
 * REAL LOGOS ONLY. Each file in public/clients is the client's own mark,
 * taken from the brand files we delivered or from the client's live site,
 * and turned into one ink (black on transparent) so the row reads as one
 * calm line in both themes; CSS sets that ink to the page's type colour.
 * Wordmarks keep their silhouette; the crests (OOU, OOUSUG) and ExamBeta's
 * square keep their inner lines by turning white areas transparent, so a
 * crest is not a solid disc. A brand without a usable logo file is left out
 * rather than set as typed text pretending to be a logo.
 *
 * `h` is the drawn height in px at the row's base size: wordmarks sit at the
 * cap height of the row, round marks a little taller so they carry the same
 * visual weight.
 */
export type ClientLogo = { name: string; src: string; w: number; h: number; size?: number };

const png = (slug: string, name: string, w: number, size = 1): ClientLogo =>
  ({ name, src: `/clients/${slug}.png`, w, h: 96, size });

export const CLIENT_LOGOS: ClientLogo[] = [
  { name: "Harize Global", src: "/clients/harize-global.svg", w: 706, h: 94 },
  png("meridian-global-trainings", "Meridian Global Trainings", 549),
  png("olabisi-onabanjo-university", "Olabisi Onabanjo University", 99, 1.5),
  png("realtors-practice", "Realtors' Practice", 274, 1.1),
  png("moore-designs", "Moore Designs", 350),
  png("oousug", "OOU Students' Union Government", 99, 1.5),
  { name: "Litch Consulting", src: "/clients/litch-consulting.svg", w: 575, h: 281, size: 1.25 },
  png("exambeta", "ExamBeta", 422, 0.95),
  png("my-fav-school", "My Fav School", 145, 1.15),
  png("traxstaff", "TraxStaff", 536, 0.9),
  png("nomarc", "Nomarc", 200, 1.15),
  png("rc-universal", "Riverside Crystal Universal", 522),
  png("the-brown-style", "The Brown Style", 203, 1.15),
];
