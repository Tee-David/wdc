import 'server-only';
import { db } from '@/lib/db/pool';
import { transaction } from '@/lib/db/transaction';
import { r2Config,deleteObject } from './r2';
import { avatarOwnedBy } from './client-profile-policy';
/** Existing daily tidy owns this. Four parallel 8s deletes bound provider time; no new runner. */
export async function cleanupClientAvatars() {
  const config=r2Config();if(!config.ok)return 0;
  await transaction(async c=> {
    const stale=await c.query<{user_id:string;pending_avatar_key:string}>(`SELECT user_id,pending_avatar_key FROM client_profile_preferences WHERE pending_avatar_key IS NOT NULL AND pending_avatar_at<now()-INTERVAL '1 day' LIMIT 4 FOR UPDATE`);
    for(const p of stale.rows) {
      if(!avatarOwnedBy(p.pending_avatar_key,p.user_id))continue;
      await c.query(`INSERT INTO client_avatar_cleanup(object_key,owner_id) VALUES($1,$2) ON CONFLICT(object_key) DO NOTHING`,[p.pending_avatar_key,p.user_id]);
      await c.query(`UPDATE client_profile_preferences SET pending_avatar_key=NULL,pending_avatar_at=NULL WHERE user_id=$1`,[p.user_id]);
    }
  });
  const pending=await db.query<{object_key:string;owner_id:string}>(`SELECT object_key,owner_id FROM client_avatar_cleanup WHERE not_before<=now() ORDER BY created_at LIMIT 4`);
  const removed=await Promise.all(pending.rows.map(async item=> {
    if(!avatarOwnedBy(item.object_key,item.owner_id))return 0;
    const referenced=await db.query(`SELECT 1 FROM client_profile_preferences WHERE avatar_key=$1 OR pending_avatar_key=$1`,[item.object_key]);
    if(referenced.rowCount)return 0;
    if(!await deleteObject({config:config.config,key:item.object_key}))return 0;
    await db.query(`DELETE FROM client_avatar_cleanup WHERE object_key=$1`,[item.object_key]);return 1;
  }));
  return removed.reduce<number>((a,b)=>a+b,0);
}
