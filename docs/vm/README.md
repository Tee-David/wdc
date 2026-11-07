# wdc on the WDC Projects VM

Since 2026-11-08 the site can run on the OCI VM **WDC Projects** (tenancy
web3aether, 92.5.43.199), in place of Vercel.

| Thing | Value |
|---|---|
| Folder | `/srv/projects/wdc/` (system user `wdc`) |
| Releases | `/srv/projects/wdc/releases/<commit>/`, `current` links to the running one |
| Env | `/etc/wdc/env` (root:wdc 640), copied from Vercel production; `MAIL_SECRETS_KEY` and `CRON_SECRET` from Doppler `wdc/prd` |
| App | `wdc-web.service`, `next start` on 127.0.0.1:3410, memory cap 1.5 GB |
| Ingress | Cloudflare Tunnel `wdc` (`wdc-cloudflared.service`, token in `/etc/wdc/tunnel.env`). No open ports. |
| DNS | Cloudflare zone `wedigcreativity.com.ng` (wdc account). `@` and `www` are proxied CNAMEs to the tunnel; `www` redirects to the apex. Mail records copied from Vercel DNS. |
| Cron | `wdc-cron-daily.timer` (03:40 UTC) calls `/api/cron/daily` with `CRON_SECRET`. Turn it on only after Vercel stops serving the site. |

## Deploy a new release

1. On the PC: `git archive <sha> frontend | ssh ubuntu@92.5.43.199 "sudo -u wdc mkdir -p /srv/projects/wdc/releases/<sha> && sudo -u wdc tar -x -C /srv/projects/wdc/releases/<sha> --strip-components=1"`
2. On the VM: `sudo -u wdc /srv/projects/wdc/bin/wdc-build.sh <sha>`
3. On the VM: `sudo systemctl restart wdc-web`

A push to `main` does not deploy to the VM yet.
