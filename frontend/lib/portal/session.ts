import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { isAdminCapture } from "@/lib/admin/capture";
import { getClient, getClients } from "@/lib/admin/store";
import type { Client } from "@/lib/admin/types";

/**
 * THE CLIENT PORTAL'S OWN DOOR, mirroring `lib/admin/session.ts` exactly --
 * same capture bypass, same shape -- except the record on the other side of
 * a session is a `Client`, found by matching the signed-in email against
 * the store rather than trusted as a claim. `users.clientId` in
 * `lib/db/schema.ts` is where this binding will live once the database is
 * wired (set once, read directly, no matching); until then, email is the
 * only thing a session and a client record both carry.
 *
 * A SESSION CAN EXIST WITH NO MATCHING CLIENT. Somebody can sign up with
 * role "client" (the default -- see `lib/auth.ts`) without the studio ever
 * having entered them as a client yet. That is not an error, it is the
 * honest first-run state, so `client` on the return value is nullable
 * rather than this function throwing or 404ing.
 */
export const getPortalRequest = cache(async () => {
  const requestHeaders = await headers();
  const capture = isAdminCapture(requestHeaders);
  if (capture) {
    /* Which seeded client to act as, for local testing -- `c1` (Tobi
       Adeyemi / Moore Designs) unless a specific id is asked for. Same
       env-gated, non-production-only mechanism `isAdminCapture` already
       is; this header only does anything alongside a valid capture token. */
    const wantId = requestHeaders.get("x-boneyard-capture-client") || "c1";
    /* "none" is the signed-in client nobody has matched yet, so the
       not-linked screen can be seen and tested like every other. */
    const client = wantId === "none" ? null : getClient(wantId) ?? getClients()[0] ?? null;
    return {
      capture,
      session: { user: { name: client?.name ?? "Ngozi Eze", email: client?.email ?? "ngozi@example.com", image: null, role: "client" } },
      client,
    };
  }

  const { auth } = await import("@/lib/auth");
  const session = await auth.api.getSession({ headers: requestHeaders });
  const email = session?.user?.email?.toLowerCase();
  const client = email
    ? getClients({ includeArchived: true }).find((c) => c.email.toLowerCase() === email) ?? null
    : null;

  return { capture, session, client };
});

export type PortalClient = Client;
