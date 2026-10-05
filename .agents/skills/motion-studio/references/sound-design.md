# Sound design

Sound is half of "feels like a real ad". Choose the palette from the brand mood, place every effect on a visual event, duck under voice, master loud enough for social.

## Palettes (`sound.py --palette`)
| Palette | For | Bed | Drums | Brightness | Notes |
|---|---|---|---|---|---|
| clean-tech | Product films, SaaS, finance | Saw pads, 120 BPM minor 9ths + bass | four-on-floor from the first impact | mid | The WDC reel sound |
| bright-pop | Consumer apps, delivery | Major pads + plucked arpeggio | half-time kick/snap | bright | Pairs with pointer clicks and pops |
| warm-lofi | Personal brand, creative | Sine pads, dark | lazy swing kick/snare | dark | Quiet-premium, pairs with long holds |
| bold-poster | Events, drops | Heavy bass + sub kick | four-on-floor, big impacts | mid-bright | 0.3-0.8s cuts, hits on every cut |
| dreamy-glass | AI, wellness, luxury | Long sine pads + bell arpeggio | none | bright | Long reverb, sparse effects |
| minimal-ui | Mono/minimal, fintech trust | none | none | bright | Ticks, clicks, soft whooshes only |
| cinematic | Brand films, launch trailers | Low drones | none (hits only) | dark | Big risers and impacts |
| none | Silent heroes, voice only | none | none | n/a | SFX only |

## Cue vocabulary
`type` (each typed character) · `tick` (light UI) · `click` (button/pointer) · `swap` (text swap) · `pop` (pill/tile appear) · `whoosh` (transition) · `riser` (before a drop) · `impact` (logo/scene hit) · `hit` (smaller) · `ding` (success/landing) · `success` · `notify` · `swipe`. Declare with `M.cue(t,'type')` next to the animation that causes it; the time map moves them automatically.

## Mix numbers
- Social/Reels: **-14 LUFS**, true peak ≤ -1 dBFS. Website video (rarely audible): -16 to -18 LUFS.
- Voice sits on top at 0 dB; bed+effects duck **40-55%** under it with a 0.3s smoothing envelope.
- Effects under voice: lower `sfx` gain 20-30% so words stay clear.
- Fade the last 0.25s; add 1.5-2s of pad tail on endings.
- Reverb 0.3-0.9s for UI palettes, 1.5-1.8s for cinematic/dreamy.
- Reference sound (measured): hooky social ads sit -7 to -11 LUFS; premium pieces -17 to -20 with wide dynamics (see style-library.md).

## Real music
If the user supplies a track: `sound.py --music track.mp3` loops/trims it, fades in/out and ducks it; effects still ride on top. You can sync cuts to its beats by choosing the BPM (`--bpm`) and time-mapping hits onto the grid, or by locating transients with `analyze_reference.py` (tempo estimate is rough: verify by ear/waveform). **Licensing is the user's responsibility; ask for the licence source.** Never ship a track pulled from a reference video.
If the user has ElevenLabs, they can also generate music or sound effects there and upload WAVs: drop them in `assets/` and mix with ffmpeg `amix` or `--music`.

## Per-format notes
- **Hero (muted):** design silent; skip voice and music. Still export a sounded variant if the client wants one.
- **Social:** the first 0.5s must contain a hit or a click; many viewers scroll with sound on.
- **9:16 vs 16:9:** same mix; do not re-time audio for format, only visuals.

## Honest limits
The synthesizer makes clean, usable commercial-style beds and effects. It is not a composer: for emotional music, a real track beats it. State this when proposing the sound.
