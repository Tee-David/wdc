'use server';
import { after } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/pool';
import { FAIL, OK, type ActionState } from '@/lib/admin/validate';
import { requireWorkspaceUser, requireProjectActor } from './access';
import { NOTIFICATION_CATEGORIES, notificationPreferences } from './notifications-policy';
import { dispatchWorkspaceEvents,workspaceTransaction } from './events';
function refresh(){revalidatePath('/admin');revalidatePath('/portal');}
export async function saveWorkspaceNotificationPreferences(_prev:ActionState,fd:FormData):Promise<ActionState> {
 try {
  const actor=await requireWorkspaceUser(true);const modes:Record<string,string>={};
  for(const key of NOTIFICATION_CATEGORIES){const value=String(fd.get(key)??'');if(!['immediate','digest','off'].includes(value))return FAIL({[key]:'Choose immediate, summary or off.'});modes[key]=value;}
  const days=Number(fd.get('digestDays'));if(days!==1&&days!==7)return FAIL({digestDays:'Choose daily or weekly.'});
  const prefs=notificationPreferences(modes,days);
  await workspaceTransaction(async tx=>{
   await tx.query(`INSERT INTO workspace_notification_preferences(user_id,modes,digest_days) VALUES($1,$2::JSONB,$3) ON CONFLICT(user_id) DO UPDATE SET modes=excluded.modes,digest_days=excluded.digest_days,updated_at=now()`,[actor.id,JSON.stringify(prefs.modes),prefs.digestDays]);
   for(const category of NOTIFICATION_CATEGORIES){const mode=prefs.modes[category];
    if(mode==='off')await tx.query(`UPDATE message_log SET state='Skipped',error='This person switched the email category off before sending.',settled_at=now() WHERE id IN(SELECT i.message_id FROM workspace_email_intents i JOIN workspace_events e ON e.id=i.event_id WHERE i.user_id=$1 AND i.state='pending' AND e.category=$2)`,[actor.id,category]);
    await tx.query(`UPDATE workspace_email_intents SET mode=$3,state=$4,available_at=now()+$5::INTERVAL,settled_at=CASE WHEN $3='off' THEN now() ELSE NULL END WHERE user_id=$1 AND state='pending' AND event_id IN(SELECT id FROM workspace_events WHERE category=$2)`,[actor.id,category,mode,mode==='off'?'skipped':'pending',mode==='digest'?`${prefs.digestDays} days`:'0 seconds']);
   }
  });
  refresh();return OK('Updated your personal email preferences.');
 }catch{return FAIL({},'Your preferences could not be saved. Sign in and try again.');}
}
export async function markWorkspaceNotification(_prev:ActionState,fd:FormData):Promise<ActionState> {
 try {
  const actor=await requireWorkspaceUser(true),id=String(fd.get('id')??'');
  const r=await db.query<{project_id:string}>('SELECT e.project_id FROM workspace_notifications n JOIN workspace_events e ON e.id=n.event_id WHERE n.id=$1 AND n.user_id=$2',[id,actor.id]);if(!r.rows[0])return FAIL({},'That notification is not available.');
  await requireProjectActor(r.rows[0].project_id,'read');
  await db.query('UPDATE workspace_notifications SET read_at=COALESCE(read_at,now()) WHERE id=$1 AND user_id=$2',[id,actor.id]);refresh();return OK('Marked read.');
 }catch{return FAIL({},'That notification could not be updated.');}
}
/** Only explicit recipient retry. An ambiguous previous send is disclosed, never silently retried. */
export async function retryWorkspaceNotification(_prev:ActionState,fd:FormData):Promise<ActionState> {
 try {
  const actor=await requireWorkspaceUser(true),id=String(fd.get('id')??'');
  if(fd.get('understand')!=='1')return FAIL({understand:'Confirm that a previous attempt may already have reached the mailbox.'});
  const r=await db.query<{project_id:string;event_id:string}>(`SELECT e.project_id,e.id AS event_id FROM workspace_notifications n JOIN workspace_events e ON e.id=n.event_id WHERE n.id=$1 AND n.user_id=$2 AND e.cancelled_at IS NULL`,[id,actor.id]);if(!r.rows[0])return FAIL({},'That current notification is not available.');
  await requireProjectActor(r.rows[0].project_id,'read');
  const changed=await workspaceTransaction(async tx=>{
   const result=await tx.query(`UPDATE workspace_email_intents SET state='pending',available_at=now(),retry_by=$3,error=NULL WHERE event_id=$1 AND user_id=$2 AND (state='failed' OR(state='sending' AND claimed_at<now()-INTERVAL '15 minutes')) RETURNING message_id`,[r.rows[0].event_id,actor.id,actor.name]);
   if(result.rowCount)await tx.query(`UPDATE message_log SET state='Queued',settled_at=NULL,error=NULL WHERE id=$1`,[result.rows[0].message_id]);return result;
  });
  if(!changed.rowCount)return FAIL({},'Only failed or interrupted attempts can be retried.');
  after(()=>dispatchWorkspaceEvents({eventIds:[r.rows[0].event_id]}));refresh();return OK('Retry queued. Acceptance will be recorded after the provider answers.');
 }catch{return FAIL({},'The retry could not be saved.');}
}
