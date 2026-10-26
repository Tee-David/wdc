# Intake: research first, ask second, pitch third, build last

A piece built on a guess is rebuilt later at five times the cost. Before any concept, either research and ask a few sharp questions, or pitch storylines, or ask for the material you need. When the client says "choose for me", choose, but still satisfy the brand's mood and feel, and say what you chose and why in one line.

## 1. Research before asking

Do this quietly, then ask better questions.

- **The website.** `python scripts/brand_probe.py URL --out probe --pages /about,/services` returns the real colours ranked by on-screen area, the fonts, headlines, navigation, meta descriptions, logo files and desktop and phone screenshots. Look at the screenshots: light or dark, dense or airy, photography or flat, rounded or sharp, serious or playful.
- **The brand folder.** Logos as SVG first (note colour variants, lockups, the icon alone). A brand guide, if one exists, is law for colour and type and advice for everything else.
- **What they already made.** Flyers, social posts, decks, past videos. These say more about mood than the website does.
- **The business in one line.** Who pays, for what problem, with what proof.
- **References they sent.** Run `python scripts/analyze_reference.py ref.mp4 --out refs` on each: a contact sheet, change events per 10 s, holds, the palette by share, loudness and brightness. Write down the grammar (shot length, title entrances, transitions, palette roles) and mark what you measured apart from what you guessed.

## 2. Ask at most five questions at a time

Skip any the research already answers. Offer tappable options where the host has a question tool. In order of value:

1. **Where it plays and for how long.** Social 9:16, 16:9 or 1:1; a website hero (muted loop); a preloader or page transition; a pitch deck; an event screen. 6, 15, 30, 45 or 60 seconds.
2. **Energy.** Calm and premium, confident and clean, upbeat and friendly, loud and hyped. Offer two or three looks from `taste/style-library.md` with their sheets.
3. **Voice.** None, or a voice: gender, accent, calm or cheeky. Do they generate it (ElevenLabs or a recorded actor) and send the file, or is a draft voice enough for timing?
4. **Music and sound.** A synthesised bed, their licensed track, effects only, or silence (a hero loop).
5. **The one message and the one action.** What should the viewer remember, in the viewer's words, and what should they do next?

Then, only if they matter: proof they can state (real numbers, real clients), hard no's (words, claims, colours, competitors), legal limits (finance, health and law need calm, conservative claims), and themes (dark, light, or both when the site switches).

## 3. Ask for materials, and say what happens without them

| Need | Why | If missing |
| --- | --- | --- |
| Logo as SVG: colour, white, icon only | Parts can animate; crisp at any size | Rebuild from a PNG only as a last resort and say so |
| Brand colours and fonts | A faithful palette | Use the probe's values and confirm them |
| Real screens, UI states, photos, work | The product as hero needs the real product | Recreate the screen in HTML at the real ratio and label it recreated |
| People: team, founder, customers | The human beat | Leave it out or use the work instead |
| Footage, b-roll | Realism for free | Not required |
| Voice file | The timing backbone | Write the script; offer a draft voice for timing |
| Music and its licence | Real music | The synthesised palette |
| Claim approvals, legal wording | Regulated claims | Draft conservatively and flag every claim |
| 3D renders or illustration | Looks the engine does not draw | Say it is out of scope without assets and offer the nearest CSS-3D or 2D alternative |

## 4. Mood and feel

Use this to choose, then say why. A brand profile in `brands/` overrides it.

| Feeling | Palette | Type | Physics | Sound |
| --- | --- | --- | --- | --- |
| Trusted, expert (finance, law, health) | Deep navy or ink, one bright accent, generous white | Grotesk 600 to 700, tight tracking | No overshoot; long ease-outs; steady 2 to 4 s beats | Minimal UI ticks, a quiet bed |
| Friendly app, delivery | One saturated brand colour with the product's UI | Rounded geometric 700 to 800 | Springs at damping 0.5 to 0.7; pointer clicks; pops | Bright and plucked |
| Creative studio, personal brand | Paper and ink with one hot accent | Heavy grotesk, big scale contrast | Construction, scatter and snap, small overshoot | Warm, clean-tech |
| Premium, luxury | Near-black or warm stone, metallic, serif accents | An elegant serif with a thin sans | Slow; long dissolves inside one world; few cuts | Sparse, cinematic or glassy |
| Event, hype | Duotone, giant condensed type | Condensed 800 and up | Hard cuts every 0.3 to 0.8 s; slams | Heavy bass, hits on cuts |
| AI and modern product | The product's own ground; one horizon of light | A clean sans | Typing as a story step, soft reveals | Glassy, airy |

## 5. Push back

Say it plainly, offer two or three options and recommend one, when:

- the brief packs too much into the length (a 30 s film holds five or six beats; 15 s holds three);
- a line reads as a guarantee, or invented numbers are asked for;
- the assets are low resolution or the wrong shape for the format;
- the screen and the voice would say different sentences at once;
- the look needs 3D, illustration or photography the engine cannot make;
- a hero film's motion will sit under the page's own headline;
- motion is asked for something people use dozens of times a day (see the frequency rule in `genres/web-motion.md`).

## 6. Outputs of intake

- `facts.md`: every fact, number, name and claim that may appear, each with its source (file and page, URL, or "said by the client on <date>"). Nothing goes on screen without a line here.
- A short brief at the top of `STORYLINES.md`: format, length as a range, aspect ratios, themes, voice or not, music or not, and every assumption in one line each.
