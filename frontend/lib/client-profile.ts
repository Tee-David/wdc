import 'server-only';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/pool';
import { supportCookiePresent } from '@/lib/users/support';
import { isAdminCapture } from '@/lib/admin/capture';
import type { Appearance } from './client-profile-policy';
import { rateLimit } from '@/lib/rate-limit';

export type ClientProfile = { setup_state: 'pending'|'completed'|'skipped'|null; appearance: Appearance|null; avatar_key: string|null; pending_avatar_key: string|null; display_name?:string };
/** The real signed-in client, never a support projection or a browser-supplied ID. */
export async function requireProfileClient(write=false) {
  const h=await headers();
  if (await supportCookiePresent() || isAdminCapture(h)) throw new Error('Exit the read-only view before changing your profile.');
  if(write) {
    const origin=h.get('origin');const host=h.get('x-forwarded-host')||h.get('host');
    if(!origin || !host || new URL(origin).host!==host) throw new Error('Reload this page and try again.');
  }
  const session=await auth.api.getSession({headers:h});
  if(!session) throw new Error('Sign in again to continue.');
  if((session.user as {role?:string}).role!=='client') throw new Error('This profile is available to your own client account only.');
  // Per-instance abuse control, not an account-wide quota.
  if(write&&!rateLimit(`client-profile:${session.user.id}`,30,900_000).ok)throw new Error('Wait a few minutes before changing your profile again.');
  const active=await db.query<{name:string}>(`SELECT u."name" AS name FROM "user" u JOIN "session" s ON s."userId"=u."id" WHERE u."id"=$1 AND s."id"=$2 AND s."expiresAt">now() AND u."role"='client' AND u."deactivatedAt" IS NULL
    AND EXISTS (SELECT 1 FROM admin_records c WHERE c.collection='CLIENTS' AND lower(c.data->>'email')=lower(u."email") AND coalesce((c.data->>'archived')::boolean,false)=false AND coalesce(c.data->>'mergedInto','')='')`,[session.user.id,session.session.id]);
  if(!active.rowCount) throw new Error('Your client access is unavailable. Contact the studio to reconnect it.');
  return {session,name:active.rows[0].name};
}
export async function readClientProfile(userId:string):Promise<ClientProfile|null> {
  const r=await db.query<ClientProfile>(`SELECT p.setup_state,p.appearance,p.avatar_key,p.pending_avatar_key,u."name" AS display_name FROM client_profile_preferences p JOIN "user" u ON u."id"=p.user_id WHERE p.user_id=$1`,[userId]);
  return r.rows[0]??null;
}
