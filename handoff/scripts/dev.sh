#!/bin/bash
# dev.sh stop|start  -- the Next dev server on 3100, found by port not by name
S=$SCRATCH
if [ "$1" = stop ]; then
  for pid in $(ps -eo pid,args | awk '/next dev -p 3100|next-server/ && !/awk/ {print $1}'); do
    kill "$pid" 2>/dev/null
  done
  sleep 2
elif [ "$1" = start ]; then
  . $SCRATCH/dbenv.sh; cd /home/user/wdc/frontend && CLOUDFLARE_ACCOUNT_ID=${CLOUDFLARE_ACCOUNT_ID:-localtest} BUCKET_NAME=${BUCKET_NAME:-localtest} ACCESS_KEY_ID=${ACCESS_KEY_ID:-localtest} SECRET_ACCESS_KEY=${SECRET_ACCESS_KEY:-localtest} CLOUDFLARE_R2_URL=${CLOUDFLARE_R2_URL:-https://media.example.test} BONEYARD_CAPTURE_TOKEN=local-capture BETTER_AUTH_SECRET=$(openssl rand -hex 32) BETTER_AUTH_URL=http://localhost:3100 PASSWORD_BREACH_CHECK=off NEXT_TELEMETRY_DISABLED=1 nohup npx next dev -p 3100 > $S/dev.log 2>&1 &
  sleep 8
fi
