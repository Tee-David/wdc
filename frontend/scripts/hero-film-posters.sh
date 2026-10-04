#!/usr/bin/env sh
# The homepage film's poster frames, cut from the films themselves.
#
# WHY A SCRIPT. The poster is the first thing the hero paints and the image the
# page's LCP is measured on, so it has to be the exact frame the film starts
# from (`FILM_START` in components/sections/hero.tsx). A poster exported by hand
# drifts the day the film is re-cut, and the hero then jumps from one picture
# to another as the video takes over. Re-run this whenever either film changes.
#
#   sh scripts/hero-film-posters.sh
#
# Needs ffmpeg. Writes next to the films in public/hero/film/.
set -eu

DIR="$(cd "$(dirname "$0")/.." && pwd)/public/hero/film"
AT="4.2" # keep in step with FILM_START in components/sections/hero.tsx

ffmpeg -v error -y -ss "$AT" -i "$DIR/wdc-film-16x9.mp4" -frames:v 1 -vf "scale=1920:-2" -q:v 5 "$DIR/wdc-film-16x9-1920.jpg"
ffmpeg -v error -y -ss "$AT" -i "$DIR/wdc-film-16x9.mp4" -frames:v 1 -vf "scale=1280:-2" -q:v 5 "$DIR/wdc-film-16x9-1280.jpg"
ffmpeg -v error -y -ss "$AT" -i "$DIR/wdc-film-9x16.mp4" -frames:v 1 -vf "scale=720:-2" -q:v 5 "$DIR/wdc-film-9x16-720.jpg"

ls -l "$DIR"
