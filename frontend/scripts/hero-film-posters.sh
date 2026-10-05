#!/usr/bin/env sh
# The homepage film's poster frames, cut from the films themselves.
#
# WHY A SCRIPT. The poster is the first thing the hero paints and the image the
# page's LCP is measured on, so it has to be the exact frame the film starts
# from (`FILM_START` in components/sections/hero.tsx). A poster exported by hand
# drifts the day the film is re-cut, and the hero then jumps from one picture
# to another as the video takes over. Re-run this whenever any film changes.
#
#   sh scripts/hero-film-posters.sh
#
# Needs ffmpeg. Writes next to the films in public/hero/film/. There are four
# films (16:9 and 9:16, each in dark and light) and so three posters per theme.
#
# A NEW CUT GETS NEW FILENAMES (the -v3 in them). public/sw.js serves images
# cache-first and never revalidates them, so a poster re-cut under its old name
# stays the old picture on every returning visitor's device while the new film
# plays over it.
set -eu

DIR="$(cd "$(dirname "$0")/.." && pwd)/public/hero/film"
AT="4.2" # keep in step with FILM_START in components/sections/hero.tsx

for T in dark light; do
  V=v3; [ "$T" = light ] && V=v4 # the light films were levelled to a pure white ground (v4)
  ffmpeg -v error -y -ss "$AT" -i "$DIR/wdc-film-$V-16x9-$T.mp4" -frames:v 1 -vf "scale=1920:-2" -q:v 5 "$DIR/wdc-film-$V-16x9-$T-1920.jpg"
  ffmpeg -v error -y -ss "$AT" -i "$DIR/wdc-film-$V-16x9-$T.mp4" -frames:v 1 -vf "scale=1280:-2" -q:v 5 "$DIR/wdc-film-$V-16x9-$T-1280.jpg"
  ffmpeg -v error -y -ss "$AT" -i "$DIR/wdc-film-$V-9x16-$T.mp4" -frames:v 1 -vf "scale=720:-2" -q:v 5 "$DIR/wdc-film-$V-9x16-$T-720.jpg"
done

ls -l "$DIR"
