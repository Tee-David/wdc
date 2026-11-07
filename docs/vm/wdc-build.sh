#!/usr/bin/env bash
# Build one wdc release as user wdc and switch `current` to it.
# Usage: sudo -u wdc /srv/projects/wdc/bin/wdc-build.sh <release-sha>
set -euo pipefail
REL="$1"; BASE=/srv/projects/wdc
cd "$BASE/releases/$REL"
set -a; . /etc/wdc/env; set +a
export NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--max-old-space-size=3072 HOME=$BASE npm_config_cache=$BASE/.npm
npm ci --include=dev --no-audit --no-fund
nice -n 10 npx next build
ln -sfn "$BASE/releases/$REL" "$BASE/current.new" && mv -T "$BASE/current.new" "$BASE/current"
echo "built $REL"
