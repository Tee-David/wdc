"use server";
import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { transaction } from '@/lib/db/transaction';
import { FAIL,OK,type ActionState } from '@/lib/admin/validate';
import { requireProfileClient,type ClientProfile } from './client-profile';
import { appearanceValue,avatarOwnedBy } from './client-profile-policy';
import { cleanupClientAvatars } from './client-avatar-cleanup';

export async function saveClientProfile(_prev:ActionState,fd:FormData):Promise<ActionState & {profileSaved?:boolean}> {
  try {
    const {session}=await requireProfileClient(true);
    const mode=fd.get('mode'); if(!['continue','skip','settings'].includes(String(mode))) return FAIL({},'Choose Continue or Skip for now.');
    const skip=mode==='skip';const name=String(fd.get('name')??'').trim();const appearance=appearanceValue(fd.get('appearance'));
    if(!skip && (!name || name.length>120)) return FAIL({name:'Use a name between 1 and 120 characters.'});
    if(!skip && !appearance) return FAIL({appearance:'Choose System, Light or Dark.'});
    const photo=String(fd.get('photo')??'keep');if(!['keep','replace','remove'].includes(photo)) return FAIL({},'Choose a valid photo action.');
    const removed=await transaction(async c=> {
      // Recheck account access in the transaction; layout redirects do not protect writes.
      const active=await c.query(`SELECT u."id" FROM "user" u JOIN "session" s ON s."userId"=u."id" WHERE u."id"=$1 AND s."id"=$2 AND s."expiresAt">now() AND u."role"='client' AND u."deactivatedAt" IS NULL AND EXISTS (SELECT 1 FROM admin_records c WHERE c.collection='CLIENTS' AND lower(c.data->>'email')=lower(u."email") AND coalesce((c.data->>'archived')::boolean,false)=false AND coalesce(c.data->>'mergedInto','')='') FOR UPDATE OF u`,[session.user.id,session.session.id]);
      if(!active.rowCount) throw new Error('Your account access has ended.');
      await c.query(`INSERT INTO client_profile_preferences(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING`,[session.user.id]);
      const r=await c.query<ClientProfile>(`SELECT * FROM client_profile_preferences WHERE user_id=$1 FOR UPDATE`,[session.user.id]);const p=r.rows[0];
      if(mode!=='settings' && p.setup_state!=='pending') return null;
      if(!skip && photo==='replace' && (!avatarOwnedBy(p.pending_avatar_key,session.user.id)||p.pending_avatar_key!==fd.get('pendingPhoto'))) throw new Error('That photo is no longer ready. Choose it again and retry.');
      const avatar=skip||photo==='keep'?p.avatar_key:photo==='remove'?null:p.pending_avatar_key;
      await c.query(`UPDATE client_profile_preferences SET setup_state=CASE WHEN $2='settings' THEN setup_state ELSE $2 END,appearance=CASE WHEN $3 THEN appearance ELSE $4 END,avatar_key=$5,pending_avatar_key=NULL,pending_avatar_at=NULL,finished_at=CASE WHEN $2='settings' THEN finished_at ELSE now() END,updated_at=now() WHERE user_id=$1`,[session.user.id,mode==='settings'?'settings':skip?'skipped':'completed',skip,appearance,avatar]);
      if(!skip) await c.query(`UPDATE "user" SET "name"=$2,"updatedAt"=now() WHERE "id"=$1`,[session.user.id,name]);
      await c.query(`INSERT INTO user_security_events(actor_id,target_id,event) VALUES($1,$1,$2)`,[session.user.id,skip?'profile-setup-skipped':'profile-updated']);
      const removed=[p.avatar_key,p.pending_avatar_key].filter((key):key is string=>Boolean(key)&&key!==avatar);
      for(const key of removed)if(avatarOwnedBy(key,session.user.id))await c.query(`INSERT INTO client_avatar_cleanup(object_key,owner_id) VALUES($1,$2) ON CONFLICT(object_key) DO NOTHING`,[key,session.user.id]);
      return removed;
    });
    if(removed===null)return OK('Your setup was already finished. You can edit your profile in Settings.');
    if(removed.length)after(async()=>{await cleanupClientAvatars().catch(()=>undefined);});
    revalidatePath('/portal','layout');
    return {...OK(skip?'Skipped. You can set up your profile later in Settings.':'Saved. Your profile is ready.'),profileSaved:!skip};
  } catch(error) {return FAIL({},error instanceof Error && !('code' in error)?error.message:'Your profile could not be saved. Your current details are unchanged; try again or contact the studio.');}
}

/**
 * The theme, saved the moment it is picked. Choosing Light or Dark used to wait
 * for a Save at the bottom of the form, which nobody expects of a theme switch.
 * It writes only the appearance row; the rest of the profile still saves on its own.
 */
export async function saveAppearance(value: string): Promise<ActionState> {
  try {
    const { session } = await requireProfileClient(true);
    const appearance = appearanceValue(value);
    if (!appearance) return FAIL({}, 'Choose System, Light or Dark.');
    await transaction(async (c) => {
      await c.query(`INSERT INTO client_profile_preferences(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING`, [session.user.id]);
      await c.query(`UPDATE client_profile_preferences SET appearance=$2 WHERE user_id=$1`, [session.user.id, appearance]);
    });
    return OK('Theme saved.');
  } catch {
    return FAIL({}, 'Your theme could not be saved just now. It is still applied on this device.');
  }
}
