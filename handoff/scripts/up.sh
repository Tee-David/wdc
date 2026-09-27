#!/bin/bash
# up.sh: after a container restart, start local Postgres (5433) and the dev server (3100).
S=$SCRATCH
D=/var/lib/postgresql/wdc-local/data
if ! (echo > /dev/tcp/127.0.0.1/5433) 2>/dev/null; then
  rm -f $D/postmaster.pid
  su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D $D -o '-p 5433' -l /var/lib/postgresql/wdc-local/run.log start" >/dev/null
fi
if ! (echo > /dev/tcp/127.0.0.1/3100) 2>/dev/null; then
  $S/dev.sh stop >/dev/null 2>&1; $S/dev.sh start >/dev/null 2>&1
fi
for i in $(seq 1 60); do curl -s -o /dev/null -m 90 http://localhost:3100/robots.txt && break; sleep 2; done
curl -s -o /dev/null -m 90 -w "dev %{http_code}\n" http://localhost:3100/robots.txt
