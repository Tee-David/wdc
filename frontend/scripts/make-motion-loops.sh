#!/usr/bin/env bash
# Rebuilds the muted motion loops and posters used on the Works page and the
# onboarding Branding card from the owner's "Motion for Claude" clips.
#
#   scripts/make-motion-loops.sh /path/to/dir/with/the/seven/clips
#
# The source clips are 113 MB and are NOT in git (they live in the owner's
# Drive). Each loop is 4 seconds, no audio, H.264 with faststart, longest side
# 640px, under about 600 KB, plus a poster jpg taken at the loop's midpoint.
# Start times were chosen by eye from contact sheets of each clip.
set -euo pipefail
SRC="${1:?directory holding the clips}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/public/work/motion"
mkdir -p "$OUT"

# name | source file | start seconds | kind
LOOPS=(
  "wdc-promo-brand|WDC_Social_16x9_voice_light.MP4|18|wide"
  "wdc-promo-web|WDC_Social_16x9_voice_light.MP4|24|wide"
  "wdc-promo-reel|WDC_Social_9x16_voice_light.MP4|18|tall"
  "litch-film|Litch_ChaosEdition_16x9.MP4|15|wide"
  "litch-reel|Litch_ChaosEdition_9x16.MP4|15|tall"
  "realtors-post|rp-post.MP4|2|post"
  "realtors-story|rp-story.mov|0.5|wide"
)

for row in "${LOOPS[@]}"; do
  IFS='|' read -r name file start kind <<<"$row"
  case "$kind" in
    wide) scale="scale=640:-2" ;;
    tall) scale="scale=-2:640" ;;
    post) scale="scale=-2:640" ;;
  esac
  ffmpeg -v error -y -ss "$start" -t 4 -i "$SRC/$file" -an \
    -vf "fps=24,$scale,format=yuv420p" \
    -c:v libx264 -preset slow -crf 30 -movflags +faststart "$OUT/$name.mp4"
  ffmpeg -v error -y -ss 2 -i "$OUT/$name.mp4" -frames:v 1 -q:v 4 "$OUT/$name.jpg"
  printf '%s %s KB\n' "$name" "$(( $(stat -c %s "$OUT/$name.mp4") / 1024 ))"
done
