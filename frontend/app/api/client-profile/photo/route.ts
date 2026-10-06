import { randomUUID } from 'node:crypto';
import { NextRequest,NextResponse,after } from 'next/server';
import { requireProfileClient,readClientProfile } from '@/lib/client-profile';
import { normalizeAvatar } from '@/lib/client-avatar';
import { avatarOwnedBy } from '@/lib/client-profile-policy';
import { r2Config,presignPut,presignGet } from '@/lib/r2';
import { db } from '@/lib/db/pool';
import { cleanupClientAvatars } from '@/lib/client-avatar-cleanup';
import { transaction } from '@/lib/db/transaction';
import { rateLimit } from '@/lib/rate-limit';
export const maxDuration=30;

export async function POST(request:NextRequest) {
  let stored:string|null=null;
  const config=r2Config();
  try {
    const {session}=await requireProfileClient(true);
    // In-instance abuse control, not a distributed upload quota.
    if(!rateLimit(`profile-photo:${session.user.id}`,8,600_000).ok) return NextResponse.json({error:'Too many photo attempts. Try again in a few minutes.'},{status:429});
    if(!config.ok) return NextResponse.json({error:'Photo storage is unavailable. You can continue without a photo.'},{status:503});
    if(!request.headers.get('content-type')?.startsWith('multipart/form-data')) return NextResponse.json({error:'Choose a photo file.'},{status:400});
    const reader=request.body?.getReader();if(!reader) throw new Error('Choose a photo file.');
    const chunks:Uint8Array[]=[];let size=0;
    for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2*1024*1024+64*1024){await reader.cancel();throw new Error('Choose a photo up to 2MB.');}chunks.push(value);}
    const data=await new Response(Buffer.concat(chunks),{headers:{'content-type':request.headers.get('content-type')!}}).formData();
    const file=data.get('photo');if(!(file instanceof File)) throw new Error('Choose a photo file.');
    let photo:Buffer;
    try{photo=await normalizeAvatar(file);}catch{throw new Error('Choose a still JPEG, PNG, WebP or AVIF photo up to 2MB and 16 million pixels.');}
    const key=`profiles/${encodeURIComponent(session.user.id)}/${randomUUID()}.webp`;
    // Give a bounded in-flight upload time to settle before any retry deletes it.
    await db.query(`INSERT INTO client_avatar_cleanup(object_key,owner_id,not_before) VALUES($1,$2,now()+INTERVAL '15 minutes')`,[key,session.user.id]);
    stored=key;
    const put=presignPut({config:config.config,key,contentType:'image/webp',expiresIn:60});
    const result=await fetch(put.url,{method:'PUT',headers:{'content-type':'image/webp'},body:new Uint8Array(photo),signal:AbortSignal.timeout(10_000)});
    if(!result.ok) throw new Error('Your photo could not be stored. Your current photo is unchanged.');
    const old=await transaction(async c=> {
      const active=await c.query(`SELECT u."id" FROM "user" u JOIN "session" s ON s."userId"=u."id" WHERE u."id"=$1 AND s."id"=$2 AND s."expiresAt">now() AND u."role"='client' AND u."deactivatedAt" IS NULL AND EXISTS (SELECT 1 FROM admin_records c WHERE c.collection='CLIENTS' AND lower(c.data->>'email')=lower(u."email") AND coalesce((c.data->>'archived')::boolean,false)=false AND coalesce(c.data->>'mergedInto','')='') FOR UPDATE OF u`,[session.user.id,session.session.id]);
      if(!active.rowCount) throw new Error('Sign in again before saving your photo.');
      await c.query(`INSERT INTO client_profile_preferences(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING`,[session.user.id]);
      const previous=await c.query<{pending_avatar_key:string|null}>(`SELECT pending_avatar_key FROM client_profile_preferences WHERE user_id=$1 FOR UPDATE`,[session.user.id]);
      await c.query(`UPDATE client_profile_preferences SET pending_avatar_key=$2,pending_avatar_at=now(),updated_at=now() WHERE user_id=$1`,[session.user.id,key]);
      await c.query(`DELETE FROM client_avatar_cleanup WHERE object_key=$1`,[key]);
      const old=previous.rows[0]?.pending_avatar_key;
      if(old&&avatarOwnedBy(old,session.user.id))await c.query(`INSERT INTO client_avatar_cleanup(object_key,owner_id) VALUES($1,$2) ON CONFLICT(object_key) DO NOTHING`,[old,session.user.id]);
      return previous.rows[0]?.pending_avatar_key;
    });
    if(old)after(async()=>{await cleanupClientAvatars().catch(()=>undefined);});
    return NextResponse.json({pendingPhoto:key},{headers:{'cache-control':'no-store'}});
  } catch {
    if(stored)after(async()=>{await cleanupClientAvatars().catch(()=>undefined);});
    return NextResponse.json({error:'The photo could not be prepared. Your current photo is unchanged; retry or continue without it.'},{status:400});
  }
}

/** Never expose a signed private-storage URL or let a browser select another key. */
export async function GET() {
  try {
    const {session}=await requireProfileClient();
    const p=await readClientProfile(session.user.id);const config=r2Config();
    if(!config.ok || !avatarOwnedBy(p?.avatar_key,session.user.id)) return new NextResponse(null,{status:404});
    const url=presignGet({config:config.config,key:p.avatar_key,expiresIn:60});
    const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(8_000)});
    if(!response.ok) return new NextResponse(null,{status:404});
    return new NextResponse(response.body,{headers:{'content-type':'image/webp','cache-control':'private, no-store','x-content-type-options':'nosniff'}});
  } catch{return new NextResponse(null,{status:403});}
}
