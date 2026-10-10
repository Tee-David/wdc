import "server-only";

import { resolveSupportView, supportCookiePresent } from "@/lib/users/support";
import { cache } from "react";
import { headers } from "next/headers";
import { isAdminCapture } from "@/lib/admin/capture";
import { getClient, getClients,getProjects,getProject } from "@/lib/admin/store";
import { syncStore } from '@/lib/admin/persist';
import { db } from '@/lib/db/pool';
import { portalScope } from './scope';
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
const getPrimaryPortalRequest = cache(async () => {
  const requestHeaders = await headers();
  const capture = isAdminCapture(requestHeaders);
  const scopedSupport = await supportCookiePresent();
  if (capture && !scopedSupport) {
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
      support: null,
      supportUnavailable: false,
      session: { user: { name: client?.name ?? "Ngozi Eze", email: client?.email ?? "ngozi@example.com", image: null, role: "client" } },
      client,
    };
  }

  const { auth } = await import("@/lib/auth");
  const session = await auth.api.getSession({ headers: requestHeaders }).catch((error: unknown) => {
    if (scopedSupport) return null;
    throw error;
  });
  if (scopedSupport) {
    const support = await resolveSupportView(session).catch(() => null);
    if (!support || !session) return { capture, session: null, client: null, support: null, supportUnavailable: true };
    return { capture, session: { ...session, user: { ...session.user, id: support.targetId, name: support.name, email: support.email, image: null, role: "client" } }, client: getClient(support.clientId)!, support, supportUnavailable: false };
  }
  const email = session?.user?.email?.toLowerCase();
  /* A LIVE RECORD FIRST, then an archived one; and a record merged into
     another is followed to the one that was kept, because every project and
     invoice moved there -- matching the dead duplicate showed an empty portal. */
  const all = email ? getClients({ includeArchived: true }) : [];
  const same = all.filter((c) => c.email.toLowerCase() === email);
  let client = same.find((c) => !c.archived) ?? same[0] ?? null;
  for (let hops = 0; client?.mergedInto && hops < 5; hops++) {
    client = all.find((c) => c.id === client!.mergedInto) ?? client;
    if (!client.mergedInto) break;
  }

  return { capture, session, client, support: null, supportUnavailable: false };
});

export type PortalClient = Client;

export const getPortalRequest=cache(async()=>{
 await syncStore();
 const request=await getPrimaryPortalRequest();
 if(request.capture||request.support)return {...request,...portalScope(getProjects(true),request.client?.id??null,[])};
 const user=request.session?.user as {id?:string;role?:string}|undefined;
 if(!user?.id||user.role!=='client')return {...request,...portalScope([],null,[])};
 const active=await db.query('SELECT id FROM "user" WHERE id=$1 AND role=\'client\' AND "deactivatedAt" IS NULL',[user.id]);
 if(!active.rowCount)return {...request,session:null,client:null,...portalScope([],null,[])};
 // Missing role migration preserves primary access, but cannot grant secondary access.
 const memberships=await db.query<{project_id:string;can_billing:boolean;can_review:boolean}>('SELECT project_id,can_billing,can_review FROM workspace_project_members WHERE user_id=$1 AND revoked_at IS NULL',[user.id]).catch(()=>({rows:[]}));
 const scope=portalScope(getProjects(true),request.client?.id??null,memberships.rows);
 const firstProject=scope.allowedProjectIds.map(id=>getProject(id)).find(Boolean);
 const displayClient=request.client??(firstProject?getClient(firstProject.clientId):null);
 return {...request,client:displayClient,...scope};
});
