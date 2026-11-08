# wdc on the WDC Projects VM

Since 2026-11-08 the site runs on the OCI VM **WDC Projects** (tenancy
web3aether, 92.5.43.199), in place of Vercel.

| Thing | Value |
|---|---|
| Folder | `/srv/projects/wdc/` (system user `wdc`) |
| Releases | `/srv/projects/wdc/releases/<commit>/`, `current` links to the running one |
| Env | `/etc/wdc/env` (root:wdc 640), copied from Vercel production; `MAIL_SECRETS_KEY` and `CRON_SECRET` from Doppler `wdc/prd` |
| App | `wdc-web.service`, `next start` on 127.0.0.1:3410, memory cap 1.5 GB |
| Ingress | Cloudflare Tunnel `wdc` (`wdc-cloudflared.service`, token in `/etc/wdc/tunnel.env`). No open ports. |
| DNS | Cloudflare zone `wedigcreativity.com.ng` (wdc account). `@` and `www` are proxied CNAMEs to the tunnel; `www` redirects to the apex. Mail records copied from Vercel DNS. |
| Cron | `wdc-cron-daily.timer` (03:40 UTC) calls `/api/cron/daily` with `CRON_SECRET`. On since the cutover (2026-11-08 00:18 UTC); Vercel no longer hosts wdc. |

## Deploy

Automatic. `frontend-autodeploy@wdc.timer` checks GitHub `main` every 5 minutes
(files in `autodeploy/`). When `frontend/` changed, it unpacks the commit to
`releases/<sha>/`, builds it as user `wdc` with `bin/wdc-build.sh`, restarts
`wdc-web` and checks health. On a failed build or health check the old release
keeps serving and the commit is marked `.failed-<sha>`.

- Pulls with the read-only deploy key `/srv/projects/wdc/.ssh/wdc_deploy_key`.
- Logs: `journalctl -u frontend-autodeploy@wdc`.
- Deploy now: `sudo systemctl start frontend-autodeploy@wdc`.
