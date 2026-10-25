# App case study: screens

Screens for the software and app case studies (design canvas: https://claude.ai/artifact/6ms2WAytQWxpKHQoRwkG7f). Not served yet; they move to `frontend/public/work/` when the page is built.

Where each set comes from (captured 2026-10-25):

- `trax-*`: TraxStaff's own product images (`web/frontend/public/screens` in the TraxStaff repo), resized. `trax-web-*`: the live site.
- `rp-*` (product): the Realtors' Practice admin redesign captures from 2026-10-23 (`redesign/evidence`), with the bottom strip cropped to drop the Next.js developer badge. `rp-web-*`: the live site.
- `li-*` and `no-*` (product): captured from the current Litch and Nomarc code, run locally against a fresh database with sample data only. No client records. `*-web-*`: the live sites.

Re-capture:

- Live sites: `node scripts/livecap2.js https://traxstaff.com out/trax-web` (desktop, tablet and phone at 2x, plus full length; declines cookie banners).
- A running app: `node scripts/appcap.js http://localhost:3200 <email> <password> out/litch /admin /admin/requests /admin/finance` (signs in with the local seed user, hides the dev overlay).

Then resize to webp: 1600px wide for desktop and tablet, 780px for phone, 1200px for full-length pages, quality 80.
