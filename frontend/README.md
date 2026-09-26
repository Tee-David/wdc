# frontend

The Next.js app behind the site, the admin and the portal. Setup, the design system and where the rules live are in the root [README](../README.md); conventions for changing code are in [AGENTS.md](../AGENTS.md).

```bash
npm install
npm run dev          # http://localhost:3000
npm run db:migrate   # apply db/migrations in order
npx playwright test <spec>
```
