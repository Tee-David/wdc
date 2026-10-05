# Intake: ask first, research second, pitch third, build last

The user's rule: **before any concept, either ask a few sharp questions, or pitch concepts, or ask for material.** They also accept "choose for me" but the goal is always to satisfy the *mood and feel* of the brand. Never start rendering a full piece on a guess.

## 1. Research the brand before asking (do this silently, then ask smarter questions)
Run `scripts/brand_probe.py URL --out probe --pages /about,/services`. It returns real colours (by on-screen area), fonts, headlines, nav, descriptions, logo files and screenshots. Then:
- **View the screenshots** (home desktop/mobile). Note: light or dark site? dense or airy? photography or flat? rounded or sharp? playful or serious?
- Pull the GitHub/brand folder if given (logos: prefer SVG; note colour variants and lockups).
- Read the one-line business explanation: *who pays, what problem, what proof*.
- Look at any flyers, social posts, decks, videos the user mentions. These tell you more than the website about mood.

## 2. Questions to ask (max 5 at a time; use the ask-user tool with tappable options on mobile)
Skip any you can already answer from research. Ask in this order of value:
1. **Where will it live and how long?** Social (9:16 / 16:9 / 1:1), website hero (muted loop), pitch deck, ad, event screen. 15s / 30s / 45s / longer.
2. **Energy.** Calm-premium, confident-clean, upbeat-friendly, loud-hype. (Map to the style families in `style-library.md`; show 2-3 contact sheets.)
3. **Voiceover?** None / female / male / accent; calm or cheeky. If yes: do they generate in ElevenLabs (send the file) or should we use a local fallback voice?
4. **Music and sound.** Synthesized bed (royalty-free, ours) / their licensed track (upload) / sound effects only / silent hero. Real music needs a file and a licence.
5. **The one message and the one action.** What should the viewer remember, and what should they do?
6. **Proof they can state.** Real numbers, clients, awards. Never invent stats; ask or leave them out.
7. **Hard no's.** Words, claims, colours, competitors to avoid; legal limits (regulated industries: finance, health, law).
8. **Themes.** Dark, light or both? (Hero sites need to match their theme switch.)

## 3. Materials to request (be specific, push back on what is missing)
| Need | Why | If missing |
|---|---|---|
| Logo as **SVG** (colour + white + icon-only) | Animate parts, crisp at any size | Rebuild from PNG only as a last resort, and say so |
| Brand colours + fonts | Faithful palette; the probe gives defaults | Use probe values, confirm with the user |
| **Real** screenshots / UI / photos / work samples | UI-as-hero needs real screens; stock reads as generic | Recreate app screens in HTML at phone ratio (label them "recreated") |
| People photos (team, founder) | Human beat; photo-in-window moves | Skip or use abstract shapes |
| Existing video clips / b-roll | Free realism | Not required |
| Voiceover file (ElevenLabs etc.) | Timing backbone | Write script, offer local TTS draft |
| Music track + licence | Real music | Use the synthesized palette |
| Copy approvals / legal wording | Regulated claims | Draft conservative, flag every claim |
| 3D / illustrations | Styles R09/R22 | Say it is out of scope without assets; offer CSS-3D alternative |

## 4. Mood and feel map (use it to choose, then say why)
| Feeling | Palette | Type | Motion physics | Sound |
|---|---|---|---|---|
| Trustworthy, expert (finance, legal, health) | Deep navy/ink + one bright accent, lots of white | Grotesk 600-700, tight tracking | Smooth `eo`/`eio`, no bounce, steady 2-4s beats | minimal-ui / clean-tech, quiet bed, soft ticks |
| Friendly app / delivery | One saturated brand colour + dark UI | Rounded geometric 800 | Springs, pointer clicks, pops | bright-pop |
| Creative studio / personal brand | Paper + black + one hot accent | Heavy grotesk, big contrast | Scatter-snap, confetti, overshoot | warm-lofi / clean-tech |
| Premium / luxury | Near-black, metallic, serif accents | Elegant serif + thin grotesk | Slow, long dissolves, minimal cuts | dreamy-glass / cinematic, sparse |
| Event / hype | Duotone, huge condensed type | Condensed 800+ | Hard cuts 0.3-0.8s, slams | bold-poster |
| AI / modern product | Black + blue horizon glow, glass | Clean sans | Prompt typing, soft glow reveals | dreamy-glass |

## 5. Pitch format (always 3 concepts, one recommended)
For each: **name + logline**, **look** (palette, type, references by R-number), **motion idea** (the signature move), **sound + voice**, **beat sheet** (time / screen / voice), **assets needed**, **risk**. End with *"I'd choose X because..."* and 1-2 questions. Keep each concept to ~120 words. Wait for the user's pick unless they said "choose for me".

## 6. Push back when
- The brief packs too many ideas for the length (rule of thumb: 30s holds 5-6 beats; 15s holds 3).
- A claim could be read as a guarantee, or invented numbers are requested.
- Assets are low-res or the wrong shape for the format.
- Copy and screen would compete (a sentence on screen while a different sentence is spoken).
- The chosen style needs assets or tools the engine cannot provide (say what, and offer the nearest alternative).
