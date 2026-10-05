# Cal.com setup evidence

Verified 2026-10-05. This is setup evidence, not a claim that booking is live.

- `CAL_API_KEY` authenticates successfully against hosted Cal.com API v2.
- The authenticated account matches the owner-confirmed email and username `wedigcreativity`.
- Event types: none. A working-hours schedule exists in `Africa/Lagos`.
- Doppler project `wdc`: `CAL_API_KEY` synced to `dev`, `stg`, and `prd`; each value was read back and compared in memory with the local value.
- The local environment currently has no `CAL_PASSWORD`. No password value was copied or invented.
- Existing secrets for other services and personal Doppler configurations were preserved.
- Credentials stay in the local ignored environment and Doppler; no credential values belong in this document.

Remaining: finish the WDC design artifact for review, then implement the approved booking/Meetings plan, configure meeting types and connected calendar/conferencing, and verify the complete deployed flow. Doppler synchronization alone does not establish Vercel runtime configuration or a working booking journey.
