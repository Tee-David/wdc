/**
 * Motion work: muted four second loops cut from finished films.
 *
 * Built by scripts/make-motion-loops.sh from clips that are not in git, so the
 * files in public/work/motion can always be remade. `kind` uses the same names
 * as the onboarding form's motion choices (promo video, social reel,
 * explainer) so a visitor and the form say the same thing.
 */
export type MotionPiece = {
  id: string;
  title: string;
  client: string;
  kind: "Promo video" | "Social reel" | "Explainer" | "Animated post";
  src: string;
  poster: string;
  width: number;
  height: number;
  alt: string;
};

const piece = (
  id: string, title: string, client: string, kind: MotionPiece["kind"],
  width: number, height: number, alt: string,
): MotionPiece => ({
  id, title, client, kind, width, height, alt,
  src: `/work/motion/${id}.mp4`,
  poster: `/work/motion/${id}.jpg`,
});

export const MOTION_PIECES: MotionPiece[] = [
  piece("wdc-promo-brand", "Studio film: branding", "We Dig Creativity", "Promo video", 640, 360,
    "The branding scene of the studio film: Moore Designs, Marfaa, Millcon and a campaign poster arranged on a pale ground."),
  piece("wdc-promo-web", "Studio film: web", "We Dig Creativity", "Promo video", 640, 360,
    "The web scene of the studio film: a property platform on a laptop and a phone."),
  piece("litch-film", "Litch Consulting film", "Litch Consulting", "Explainer", 640, 360,
    "A scene from the Litch Consulting film with the line Nothing adds up over soft interface cards."),
  piece("realtors-story", "Realtors' Practice story", "Realtors' Practice", "Explainer", 640, 354,
    "A scene from the Realtors' Practice story: the word Fragmented over scattered property notes."),
  piece("wdc-promo-reel", "Studio reel: branding", "We Dig Creativity", "Social reel", 360, 640,
    "The vertical studio reel showing the branding scene."),
  piece("litch-reel", "Litch Consulting reel", "Litch Consulting", "Social reel", 360, 640,
    "The vertical Litch Consulting reel with the line Nothing adds up."),
  piece("realtors-post", "Realtors' Practice post", "Realtors' Practice", "Animated post", 512, 640,
    "An animated four by five post for Realtors' Practice: fragmented property information on a blue ground."),
];
