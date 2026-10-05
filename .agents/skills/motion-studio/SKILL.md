---
name: motion-studio
description: Complete motion-graphics studio for any brand. Use this skill whenever the user wants a motion design video, brand film, promo, product or app ad, social ad, showreel, kinetic-typography piece, logo reveal, explainer, website hero loop, or "a video like these references", for We Dig Creativity (WDC) or ANY other client or business. It covers intake and brand research (reading a website, logos, flyers), choosing a style from a 25-reference taste library, pitching concepts, scriptwriting, ElevenLabs/voiceover alignment and time-mapping, synthesized sound design or real music, deterministic HTML-to-MP4 rendering in 16:9 and 9:16, dark/light variants, muted hero loops, and QC. Trigger even when the user only says "make a video for [brand]", "motion graphics", "animate this", "30 second ad", "reel", or uploads reference videos or a voiceover file; do not wait for the word "motion".
---

# Motion Studio

A repeatable studio for brand motion work: **research the brand → ask/pitch → script & voice → build with the engine → preview → sound → render → QC → hand off.** Every piece is rendered from an HTML page that is a pure function of time, so it can be re-timed to a voiceover, re-themed (dark/light), re-laid-out (16:9/9:16), spliced and resumed.

The user's taste (from 25 references): clean, product-forward, confident; brand-colour or white/black canvases; UI as hero; kinetic type; pointer-driven demos; soft shadows; gentle blur-swaps; sound that feels like a real commercial. They want you to **go all out every time**, push back on weak briefs, and ask for the materials you need.

## The workflow

### 0. Intake (read `references/intake.md`)
Never start a full piece on a guess. Do research first, then ask or pitch.
1. **Research the brand:** `python scripts/brand_probe.py URL --out probe --pages /about,/services` (colours by area, fonts, headlines, logos, screenshots). View the screenshots. Read any GitHub brand folder, flyers, posts, decks, or business explanation the user shares.
2. **Ask ≤5 sharp questions** (use the ask-user tool): platform/length, energy, voiceover, music vs synthesized, message + action. Skip what the research already answers.
3. **Request materials** you actually need (SVG logo, real screens/photos, voice file, music licence, stats approval). Say what you'll do if they're missing.
4. If the user says "choose for you", choose from the library yet still satisfy the brand's **mood and feel**.

### 1. Pitch 3 concepts (format in `references/intake.md` §5)
Name, look (cite R-numbers from `references/style-library.md`), signature move, sound/voice, beat sheet, assets, risk; recommend one; **wait for a pick** unless told to proceed.

### 2. Script, voice, copy (`references/copywriting.md`, `references/voice.md`)
Write for the ear (2.3-2.8 words/s). Give the user a paste-ready ElevenLabs v3 block (tags, pauses, voice direction, export spec). When they send the file: `align_voice.py` → `beats.json` → `build_timemap.py`. Video length = audio length.

### 3. Build (`references/engine-api.md`, `references/motion-vocab.md`)
```
python scripts/new_project.py my-film --style keynote-dark      # --list to see presets
python scripts/fetch_font.py "Inter" --dir my-film/fonts         # any Google font in the registry
# edit my-film/project.js (copy, assets, scenes, M.cue sound cues)
```
Presets (`engine/styles.json`, each with dark+light): keynote-dark · app-promo · kinetic-paper · poster-duotone · aurora-glass · mono-minimal · brand-flood. Replace tokens with the **client's** palette/fonts (`tokens.js`).
Templates: `templates/keynote.js`, `app.js`, `kinetic.js`: working scene structures, not locked designs. Mix moves from `motion-vocab.md` freely; invent new scenes with `M.scene`.

### 4. Preview before rendering
`python scripts/render.py DIR --w 1920 --h 1080 --dur N --sheet 0.5,2,4,6 --sheet-out s.jpg` (and `--w 1080 --h 1920`). **View the sheet.** Fix: centered hooks, one-line titles, nothing clipped, no tile over a headline, correct fonts. Show the user a still or a storyboard sheet for direction approval when the concept is new.

### 5. Sound (`references/sound-design.md`)
`python scripts/sound.py --cues DIR/cues.json --dur N --palette clean-tech [--timemap map.json] [--voice vo.mp3] [--music track.mp3] --out mix.wav`. Palettes: clean-tech · bright-pop · warm-lofi · bold-poster · dreamy-glass · minimal-ui · cinematic · none. Cue every visual event (`M.cue`). Duck under voice. Master -14 LUFS for social.

### 6. Render and QC (`references/pipeline.md`)
Run long renders **detached** (`setsid nohup ... &`) and poll; they die when the chat turn ends, so write markers and be ready to resume (parts are cached).
`python scripts/render.py DIR --w W --h H --dur N --sub 2 [--timemap] [--audio mix.wav] [--theme light] --out out.mp4`
`python scripts/qc.py out.mp4 --expect-frames F --expect-dur S --audio --sheet ... --black --freeze [--loop]`

### 7. Deliver
`present_files` for every deliverable; short hand-off note: files, durations, what to confirm (claims, stats, recreated screens), developer notes for heroes. Say what was verified by measurement vs by eye.

## Quick decisions
| Question | Default |
|---|---|
| Social vs hero? | Social: voice + sound, text synced to voice. Hero: muted, loopable, little/no headline type, shaded where page text sits. |
| Voice? | If message has a story or pain: yes. If product-UI showcase: optional. Heroes: never. |
| Music | Synth palette unless the user uploads a licensed track. |
| Length | 15s (3 beats), 30s (5-6 beats), 45s (voice-led story). |
| Themes | Build both; ship both when the site has a theme switch. |
| Fast or slow? | Match the brand mood (`intake.md` §4); trust brands slow down, hype brands cut fast. |
| 3D objects, photoreal scenery, illustrated characters | Out of engine scope: ask for assets or offer the nearest CSS-3D alternative. |

## Non-negotiables (hard-won)
1. **Pure functions of time.** No CSS animations/timers/state. Everything via `M.render(t)`.
2. **Fonts and images loaded before frame 1.** Use single quotes in `font-family` inside HTML strings.
3. **Center and don't break:** hooks and titles stay on one line; measure with `M.measure`, fit to the longest, use one size for the set; re-center rotating phrases while the old one fades.
4. **Real assets over fakes.** Phone screens show *apps*, not website pages; recreate app UIs at phone ratio when needed and say they're recreated. No stock imagery posing as client work.
5. **Screen and voice never compete.** Anchor words on screen at key moments; imagery between.
6. **Orange (accent) is scarce:** one accent event per beat; no coloured glows in corners.
7. **No unbackable claims, no invented stats.** List every claim in the hand-off.
8. **Never run two render pipelines on one output.** Splice by trim+concat; encode once.
9. **Verify:** `qc.py` + contact sheets after every render; inspect splice frames; be honest that audio tone needs the user's ears.
10. **Sound on every visual event** and a hit in the first 0.5s for social.

## Pushing back and asking (the user wants this)
Tell them plainly when: the brief overloads the length, copy reads as a guarantee, assets are low-res/missing, the style needs 3D/illustration/photos, screen text will fight the voice, or the hero text colour won't read on the video. Offer 2-3 options and recommend one with a reason. Ask for the exact asset you need.

## Reference map (load only what you need)
| File | When |
|---|---|
| `references/intake.md` | Starting any project; questions, asset requests, mood map, pitch format |
| `references/style-library.md` + `references/library/sheet_*.jpg` | Choosing a look; each of the 25 references analysed, with sound stats |
| `references/motion-vocab.md` | Easing, moves, composition rules |
| `references/engine-api.md` | Writing `project.js` |
| `references/sound-design.md` | Palettes, cues, mix, real music |
| `references/voice.md` | ElevenLabs workflow, alignment, time map, local fallback |
| `references/copywriting.md` | Scripts, claims, budgets |
| `references/pipeline.md` | Rendering, formats, hero specs, QC, gotchas |
| `references/brands/*.md` | Per-client notes (tokens, voice, corrections). Add one per client. |
| `reference-implementations/wdc-reel/` | The original hand-built 42.6s reel (pre-engine): see how a voice-synced, dual-theme, dual-format piece was assembled |

## Environment notes (claude.ai sandbox)
Chromium: `/opt/pw-browsers/chromium-*/chrome-linux/chrome` (auto-detected; override `CHROME_PATH`). `pip install --break-system-packages`. Commands cap ~300s. No audio playback and no ElevenLabs key in the sandbox: audio is verified by measurement; ElevenLabs calls are the user's job (web app) unless they provide a key.
When you create a brand, add `references/brands/<brand>.md` (tokens, voice, claims policy, assets, what was approved/rejected) so next time starts informed.
