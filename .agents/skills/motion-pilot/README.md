# Motion Pilot

A motion design skill for AI agents. It turns an agent into the motion director of a small studio: it researches the brand, writes three storylines and lets you pick one, specifies the film in numbers instead of adjectives, boards it, builds it as deterministic HTML, scores it with sound and voice, renders it to MP4 in 16:9 and 9:16, light and dark, and reviews it with measurements before anything ships. It also makes motion for websites (preloaders, page curtains, hero loops, arrival choreography) and reviews motion made by anyone.

The principles come from keyframe animation, from studio practice, and from a library of 33 studied references and the corrections that turned first drafts into approved work.

## What it makes

- Brand films, product demos, explainers, launch and social ads, reels and showreels
- Logo reveals and end cards built from the mark's own parts
- Kinetic typography and data stories
- Muted website hero loops with posters and chapter times
- Preloaders, page transitions and UI motion that never block the page
- Reviews: contact sheets, strips around every cut, phone-width sheets, holds, dead stretches, off-palette blends and loudness

## Layout

```
SKILL.md                    the steering document the agent reads first
references/
  process/                  intake, storylines, spec, storyboard, review, delivery
  craft/                    principles, timing and easing, transitions, type, logo construction,
                            composition, sound, voice, copywriting
  genres/                   one playbook per kind of piece
  taste/                    the style library (33 references with contact sheets and measurements)
                            and the lessons behind the rules
  brands/                   a profile template, and profiles of the brands worked on
  tech/                     the engine's API and the render pipeline
engine/                     motion.js (time, curves, springs, scenes), components.js, styles.json
templates/                  keynote, app and kinetic starting structures
scripts/                    brand_probe, analyze_reference, new_project, fetch_font, render, sound,
                            align_voice, build_timemap, voice tools, qc, review
fonts/                      Space Grotesk and Outfit (OFL) as offline fallbacks
reference-implementations/  worked examples: a voice-led reel and two shipped preloaders
```

## Install

Copy the folder into your agent's skills directory (for example `.claude/skills/motion-pilot/` or `.agents/skills/motion-pilot/`). The agent loads `SKILL.md` when a request matches its description.

Rendering needs Python 3 with `playwright`, `numpy`, `pillow` and `scipy`, plus `ffmpeg` and a Playwright Chromium (`render.py` finds one, or set `CHROME_PATH`). Voice alignment needs `faster-whisper`; the local draft voice needs `kokoro-onnx`. Nothing is needed until a render is actually requested.

## Quick start

```bash
python scripts/new_project.py my-film --style keynote-dark      # --list shows the presets
# fill my-film/facts.md, STORYLINES.md and SPEC.md, then edit my-film/project.js
python scripts/render.py my-film --w 1920 --h 1080 --dur 12 --sheet 1,3,5,7,9,11 --sheet-out board.jpg
python scripts/sound.py --cues my-film/cues.json --dur 12 --palette clean-tech --out mix.wav
python scripts/render.py my-film --w 1920 --h 1080 --dur 12 --audio mix.wav --out film.mp4
python scripts/qc.py film.mp4 --expect-frames 360 --expect-dur 12 --audio --black --freeze
python scripts/review.py film.mp4 --out review/
```

## Before publishing this repository

- `references/brands/` holds working notes on client brands; keep only the template and brands you have permission to publish.
- `references/taste/library/` holds contact sheets of third-party films used for study. Replace them with your own references or links if you cannot publish them.
- `reference-implementations/` contains a studio's own production code and recreated client screens; check you are happy to share them.
- Choose and add a licence.
