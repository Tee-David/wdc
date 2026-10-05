# Public tools: implementation and cost controls

The current tool registry is `frontend/lib/tools.ts`. Domain modules and handlers under `frontend/lib/` and `frontend/app/api/tools/` define what each tool actually does. Use them for the current inventory; an old feature proposal is not a shipped tool.

## Cost rules

Prefer browser/local calculation where it answers the user's question. Network lookups need bounded requests, timeouts and useful fallback output. A free-to-use feature can still consume hosting, bandwidth or provider quota; do not describe it as infrastructure-free.

Paid requests require a configured provider, a measured cost and a budget that stops expenditure. In-memory per-instance limits are abuse control, not a distributed hard quota. Do not add workers, queues or headless browsers without a measured requirement and operational ownership.

## Result quality

Explain what was checked and distinguish unavailable data from a valid empty result. Inspect unsuccessful HTTP responses; do not present failures as no findings. Keep URLs and uploads server-validated, protect network-fetch tools against unsafe targets, and keep provider keys off the client.

The business-name check gives guidance rather than guaranteed registration availability; domain and email checks describe the evidence they have. New tools need current capability verification and targeted tests before becoming public promises.

## Interface

Reuse the shared form kit and existing result components. Make input corrections reversible, give immediate feedback, preserve keyboard/touch access and test real content at phone widths. Keep optional external work away from the critical rendering path.
