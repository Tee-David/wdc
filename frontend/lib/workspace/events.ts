import 'server-only';
import { createHash,randomUUID } from 'node:crypto';
import type { PoolClient, QueryResultRow } from 'pg';
import { db } from '@/lib/db/pool';
import { SITE_URL } from '@/lib/site';
import { sendQueuedLogged } from '@/lib/outbox';
import { workspaceNotificationEmail } from '@/lib/email-templates';
import { dueDate, workspaceHref, type NotificationCategory } from './notifications-policy';
import { effectiveWorkspacePreferences } from './notifications-preferences';

export type Queryable = Pick<PoolClient,'query'>;
export type WorkspaceRecipient = {userId:string; href?:string; clientId?:string; email?:string; suppressEmailReason?:string};
export type WorkspaceEvent = {
 id:string;projectId:string;clientId?:string;kind:string;category:NotificationCategory;
 actorId:string;actorName:string;title:string;summary:string;href:string;visibility:'client'|'internal';
 recipients:readonly WorkspaceRecipient[];dueAt?:string|null;availableAt?:string|null;staleKey?:string;recipientPurpose?:"review"|"billing"|"updates";
};
export async function workspaceTransaction<T>(work:(tx:Queryable)=>Promise<T>):Promise<T> {
 const client=await db.connect();
 try { await client.query('BEGIN');const result=await work(client);await client.query('COMMIT');return result; }
 catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
/** Caller validates actor and scopes recipient accounts. Persist alongside the changed work using tx. */
export async function emitWorkspaceEvent(input:WorkspaceEvent, tx?:Queryable):Promise<string> {
 if(input.kind==='project.access_revoked')input={...input,title:'Project assignment ended',summary:'Your assignment as project lead has ended. Contact the studio if you need help with the handover.',href:'/admin/projects',visibility:'internal',category:'actions',recipientPurpose:'updates'};
 if(!tx)return workspaceTransaction(q=>emitWorkspaceEvent(input,q));
 if(!/^[0-9a-f-]{36}$/i.test(input.id)||!input.actorId||!input.projectId)throw new Error('The event identity and actor are required.');
 const href=workspaceHref(input.href), due=dueDate(input.dueAt);
 const inserted=await tx.query(`INSERT INTO workspace_events(id,project_id,client_id,kind,category,actor_id,actor_name,title,summary,href,visibility,due_at,stale_key,recipient_purpose)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT(id) DO NOTHING RETURNING id`,[input.id,input.projectId,input.clientId??null,input.kind,input.category,input.actorId,input.actorName,input.title.slice(0,200),input.summary.slice(0,3000),href,input.visibility,due,input.staleKey??null,recipientPurpose(input)]);
 if(!inserted.rowCount)return input.id;
 for(const recipient of new Map(input.recipients.map(r=>[r.userId,r])).values()) {
  const found=await tx.query<{id:string;email:string;role:string;modes:unknown;digest_days:number}>(`SELECT u.id,u.email,u.role,p.modes,p.digest_days FROM "user" u LEFT JOIN workspace_notification_preferences p ON p.user_id=u.id WHERE u.id=$1 AND (u."deactivatedAt" IS NULL)`,[recipient.userId]);
  let user=found.rows[0];
  if(recipient.userId.startsWith("client:")){const contact=await emailOnlyContact(recipient.userId,input.projectId,input.visibility,input.kind,tx);if(contact)user={id:recipient.userId,email:contact.email,role:"client",modes:null,digest_days:7};}
  if(!user)continue;
  if(input.kind.startsWith('invitation.')&&!await invitationEventCurrent(input.kind,input.staleKey,input.kind==='invitation.expiring_client'?user.email:null,tx))continue;
  if(!user.id.startsWith("client:")&&!await eventRecipientAllowed(input,user.id,tx))continue;
  if(input.visibility==='internal'&&user.role!=='owner'&&user.role!=='staff')continue;
  const target=workspaceHref(recipient.href??(user.role==='client'?href.replace(/^\/admin\/projects\//,'/portal/projects/'):href));
  if(!user.id.startsWith('client:'))await tx.query('INSERT INTO workspace_notifications(event_id,user_id,href) VALUES($1,$2,$3) ON CONFLICT(event_id,user_id) DO NOTHING',[input.id,user.id,target]);
  const prefs=effectiveWorkspacePreferences(user.email,user.modes,user.digest_days),mode=recipient.suppressEmailReason?"off":prefs.modes[input.category];
  const key=`workspace:${input.id}:${user.id}`;
  const log=await tx.query<{id:string}>(`INSERT INTO message_log(channel,direction,to_addr,subject,summary,state,error,sent_by,client_id,about,dedupe_key)
   VALUES('Email','Outbound',$1,$2,$3,$4,$5,$6,$7,$8::JSONB,$9) ON CONFLICT(dedupe_key) DO UPDATE SET dedupe_key=excluded.dedupe_key RETURNING id`,[user.email,input.title.slice(0,200),input.summary.slice(0,500),mode==='off'?'Skipped':'Queued',mode==='off'?(recipient.suppressEmailReason?.slice(0,200)??'This person has this email category switched off.'):null,input.actorName,input.clientId??null,JSON.stringify({kind:input.projectId.startsWith('client:')?'client':'project',id:input.projectId.startsWith('client:')?input.clientId:input.projectId,label:input.title.slice(0,200)}),key]);
  const available=dueDate(input.availableAt??(input.category==='reminders'?input.dueAt:null));
  await tx.query(`INSERT INTO workspace_email_intents(event_id,user_id,message_id,href,mode,state,available_at,recipient_email,recipient_client_id)
   VALUES($1,$2,$3,$4,$5,$6,GREATEST(COALESCE($7::TIMESTAMPTZ,now()),now()+$8::INTERVAL),$9,$10) ON CONFLICT(event_id,user_id) DO NOTHING`,[input.id,user.id,log.rows[0].id,target,mode,mode==='off'?'skipped':'pending',available,mode==='digest'?`${prefs.digestDays} days`:'0 seconds',user.email,user.id.startsWith('client:')?user.id.slice(7):null]);
 }
 return input.id;
}
export async function cancelWorkspaceEvents(projectId:string, staleKey:string,tx:Queryable=db) {
 await tx.query(`UPDATE workspace_events SET cancelled_at=now() WHERE project_id=$1 AND stale_key=$2 AND cancelled_at IS NULL`,[projectId,staleKey]);
 await tx.query(`UPDATE message_log SET state='Skipped',error='The action changed or was completed before this notice was sent.',settled_at=now() WHERE id IN(SELECT i.message_id FROM workspace_email_intents i JOIN workspace_events e ON e.id=i.event_id WHERE e.project_id=$1 AND e.stale_key=$2 AND e.cancelled_at IS NOT NULL AND i.state='pending')`,[projectId,staleKey]);
 await tx.query(`UPDATE workspace_email_intents SET state='skipped',settled_at=now(),error='Stale action' WHERE event_id IN(SELECT id FROM workspace_events WHERE project_id=$1 AND stale_key=$2 AND cancelled_at IS NOT NULL) AND state='pending'`,[projectId,staleKey]);
 await tx.query(`UPDATE workspace_notifications SET actioned_at=now() WHERE event_id IN(SELECT id FROM workspace_events WHERE project_id=$1 AND stale_key=$2 AND cancelled_at IS NOT NULL)`,[projectId,staleKey]);
}
type SendRow=QueryResultRow&{id:string;message_id:string;event_id:string;user_id:string;project_id:string;client_id:string|null;title:string;summary:string;href:string;actor_name:string;email:string;kind:string;recipient_purpose:"review"|"billing"|"updates";category:NotificationCategory;visibility:'client'|'internal';due_at:Date|null;mode:string;stale_key:string|null;modes:unknown;digest_days:number};
/** Bounded worker: claim once. A vanished/ambiguous SMTP attempt never becomes an automatic second send. */
export async function dispatchWorkspaceEvents(options:{eventIds?:readonly string[];limit?:number}={}) {
 await (await import("@/lib/admin/persist")).syncStore(); // Cold cron instances must honour persisted legacy client opt-outs.
 const result={accepted:0,failed:0,skipped:0};
 // ponytail: one SMTP attempt per tick (~23s authentication, up to ~46s with the safe spam fallback).
 // Pending recipients survive until later ticks; increase concurrency only after measured provider latency improves.
 if(!options.eventIds?.length&&await dispatchWorkspaceDigests())return result;
 const pending=await db.query<{id:string}>(`SELECT i.id FROM workspace_email_intents i WHERE i.state='pending' AND i.mode='immediate' AND i.available_at<=now() AND ($1::UUID[] IS NULL OR i.event_id=ANY($1::UUID[])) ORDER BY i.available_at LIMIT $2`,[options.eventIds?.length?options.eventIds:null,Math.min(options.limit??1,1)]);
 for(const row of pending.rows) {
  const claim=await db.query(`UPDATE workspace_email_intents SET state='sending',claimed_at=now(),attempt=attempt+1 WHERE id=$1 AND state='pending' RETURNING id`,[row.id]);if(!claim.rowCount)continue;
  const read=await db.query<SendRow>(`SELECT i.*,e.project_id,e.client_id,e.title,e.summary,e.actor_name,e.category,e.kind,e.stale_key,e.recipient_purpose,e.visibility,e.due_at,coalesce(u.email,i.recipient_email) AS email,p.modes,p.digest_days FROM workspace_email_intents i JOIN workspace_events e ON e.id=i.event_id LEFT JOIN "user" u ON u.id=i.user_id LEFT JOIN workspace_notification_preferences p ON p.user_id=i.user_id WHERE i.id=$1 AND e.cancelled_at IS NULL AND (u."deactivatedAt" IS NULL)`,[row.id]);
  const item=read.rows[0];
  const permitted=item?await recipientStillAllowed(item):false;
  if(!item||!permitted||effectiveWorkspacePreferences(item.email,item.modes,item.digest_days).modes[item.category]==='off') {
   await db.query(`UPDATE message_log SET state='Skipped',error='The action is stale or this person switched the category off.',settled_at=now() WHERE id=(SELECT message_id FROM workspace_email_intents WHERE id=$1)`,[row.id]);
   await db.query(`UPDATE workspace_email_intents SET state='skipped',settled_at=now() WHERE id=$1`,[row.id]);result.skipped++;continue;
  }
  const url=new URL(item.href,SITE_URL).toString();
  try {
   await sendQueuedLogged({to:item.email,...workspaceNotificationEmail({title:item.title,summary:item.summary,url,dueAt:item.due_at?new Date(item.due_at).toISOString():null,audience:item.href.startsWith('/portal/')?'client':'staff',invitationReminder:item.kind==='invitation.expiring_client'})},{summary:item.summary.slice(0,500),dedupeKey:`workspace:${item.event_id}:${item.user_id}`,by:item.actor_name,clientId:item.client_id??undefined,about:{kind:'project',id:item.project_id,label:item.title}},item.message_id);
   await db.query(`UPDATE workspace_email_intents SET state='accepted',settled_at=now(),error=NULL WHERE id=$1`,[row.id]);result.accepted++;
  } catch {await db.query(`UPDATE workspace_email_intents SET state='failed',settled_at=now(),error='The provider did not confirm acceptance. See the message log.' WHERE id=$1`,[row.id]);result.failed++;}
 }
 return result;
}
export function newWorkspaceEventId(){return randomUUID();}
async function currentRecipients(projectId:string,category:NotificationCategory,visibility:'client'|'internal'='client',purpose?:'review'|'billing'|'updates') {
 const {projectRecipients}=await import('./access');
 return projectRecipients(projectId,visibility==='internal'?'internal':'all',purpose??(category==='billing'?'billing':'updates'));
}
function stableUuid(key:string){const h=createHash('sha256').update(key).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;}
/** These reminders name the persisted deadline. Completing or replacing its event cancels them. */
export async function queueWorkspaceReminders() {
 const due=await db.query<{id:string;project_id:string;client_id:string|null;title:string;summary:string;href:string;visibility:'client'|'internal';due_at:Date;stale_key:string|null;category:NotificationCategory;recipient_purpose:'review'|'billing'|'updates'}>(`SELECT * FROM workspace_events WHERE due_at<=now()+INTERVAL '1 day' AND due_at>now()-INTERVAL '30 days' AND cancelled_at IS NULL AND (category='actions' OR (category='billing' AND stale_key LIKE 'service:%')) ORDER BY due_at LIMIT 100`);
 for(const source of due.rows) {
  const overdue=source.due_at.getTime()<Date.now(),id=stableUuid(`${source.id}:${overdue?'overdue':'due-soon'}`);
  const original=await db.query<{user_id:string;href:string}>(`SELECT i.user_id,i.href FROM workspace_email_intents i LEFT JOIN workspace_notifications n ON n.event_id=i.event_id AND n.user_id=i.user_id WHERE i.event_id=$1 AND n.actioned_at IS NULL`,[source.id]);
  const allowed=await currentRecipients(source.project_id,source.category,source.visibility,source.recipient_purpose);
  const recipients=original.rows.filter(r=>allowed.some(a=>a.userId===r.user_id)).map(r=>({userId:r.user_id,href:r.href}));
  if(!recipients.length)continue;
  await emitWorkspaceEvent({id,projectId:source.project_id,clientId:source.client_id??undefined,kind:overdue?'reminder.overdue':'reminder.due_soon',category:'reminders',actorId:'workspace-scheduler',actorName:'Project reminders',title:`${overdue?'Overdue':'Due soon'}: ${source.title}`,summary:`${source.summary}\nThe agreed deadline is ${source.due_at.toISOString()}. Open the record to answer or ask the lead to agree a new date. No response is treated as approval.`,href:source.href,visibility:source.visibility,recipients,dueAt:source.due_at.toISOString(),availableAt:new Date().toISOString(),recipientPurpose:source.recipient_purpose,staleKey:source.stale_key??`event:${source.id}`});
 }
 return {checked:due.rowCount??0};
}
async function dispatchWorkspaceDigests() {
 const people=await db.query<{user_id:string}>(`SELECT DISTINCT user_id FROM workspace_email_intents WHERE state='pending' AND mode='digest' AND available_at<=now() LIMIT 1`);
 let processed=false;
 for(const person of people.rows) {
  const rows=await db.query<SendRow>(`SELECT i.*,e.project_id,e.client_id,e.title,e.summary,e.actor_name,e.category,e.kind,e.stale_key,e.recipient_purpose,e.visibility,e.due_at,coalesce(u.email,i.recipient_email) AS email,p.modes,p.digest_days FROM workspace_email_intents i JOIN workspace_events e ON e.id=i.event_id LEFT JOIN "user" u ON u.id=i.user_id LEFT JOIN workspace_notification_preferences p ON p.user_id=u.id WHERE i.user_id=$1 AND i.state='pending' AND i.mode='digest' AND i.available_at<=now() AND e.cancelled_at IS NULL AND (u."deactivatedAt" IS NULL) ORDER BY i.available_at LIMIT 30`,[person.user_id]);
  const items:SendRow[]=[];
  for(const item of rows.rows) {
   const permitted=await recipientStillAllowed(item);
   if(!permitted||effectiveWorkspacePreferences(item.email,item.modes,item.digest_days).modes[item.category]==='off') {
    await db.query(`UPDATE workspace_email_intents SET state='skipped',settled_at=now() WHERE id=$1 AND state='pending'`,[item.id]);
    await db.query(`UPDATE message_log SET state='Skipped',error='Access or personal preference changed before the summary.',settled_at=now() WHERE id=$1`,[item.message_id]);continue;
   }
   items.push(item);
  }
  if(!items.length)continue;
  const id=stableUuid(`digest:${person.user_id}:${items.map(i=>i.id).sort().join(':')}`),title=`Your project summary: ${items.length} updates`,summary=items.map(i=>`${i.title}\n${i.summary}\n${new URL(i.href,SITE_URL).toString()}`).join('\n\n');
  const claimed=await workspaceTransaction(async tx=>{
   const changed=await tx.query<{id:string}>(`UPDATE workspace_email_intents SET state='sending',claimed_at=now(),attempt=attempt+1 WHERE id=ANY($1::UUID[]) AND state='pending' RETURNING id`,[items.map(i=>i.id)]);
   if(changed.rowCount!==items.length)throw new Error('Another worker claimed the summary.');
   await tx.query(`INSERT INTO workspace_events(id,project_id,client_id,kind,category,actor_id,actor_name,title,summary,href,visibility) VALUES($1,$2,$3,'communication.summary','progress','workspace-scheduler','Project summaries',$4,$5,$6,$7) ON CONFLICT(id) DO NOTHING`,[id,items[0].project_id,items[0].client_id,title,summary.slice(0,30000),items[0].href,items.some(i=>i.href.startsWith('/admin/'))?'internal':'client']);
   if(!person.user_id.startsWith('client:'))await tx.query('INSERT INTO workspace_notifications(event_id,user_id,href) VALUES($1,$2,$3) ON CONFLICT(event_id,user_id) DO NOTHING',[id,person.user_id,items[0].href]);
   const log=await tx.query<{id:string}>(`INSERT INTO message_log(channel,to_addr,subject,summary,state,sent_by,dedupe_key) VALUES('Email',$1,$2,$3,'Queued','Project summaries',$4) ON CONFLICT(dedupe_key) DO UPDATE SET dedupe_key=excluded.dedupe_key RETURNING id`,[items[0].email,title,`${items.length} current project updates.`,`workspace-summary:${id}`]);return log.rows[0].id;
  }).catch(()=>null);if(!claimed)continue;processed=true;
  try {
   await sendQueuedLogged({to:items[0].email,...workspaceNotificationEmail({title,summary:`${items.length} current project updates.`,url:new URL(items[0].href,SITE_URL).toString(),audience:items[0].href.startsWith('/portal/')?'client':'staff',items:items.map(i=>({title:i.title,summary:i.summary,url:new URL(i.href,SITE_URL).toString()}))})},{summary:`${items.length} current project updates.`,dedupeKey:`workspace-summary:${id}`,by:'Project summaries'},claimed);
   await db.query(`UPDATE workspace_email_intents SET state='accepted',settled_at=now() WHERE id=ANY($1::UUID[])`,[items.map(i=>i.id)]);
   await db.query(`UPDATE message_log SET state='Skipped',error='Included in a project summary accepted by the provider.',settled_at=now() WHERE id=ANY($1::UUID[])`,[items.map(i=>i.message_id)]);
  }catch {await db.query(`UPDATE workspace_email_intents SET state='failed',settled_at=now(),error='Summary acceptance was not confirmed. No automatic retry.' WHERE id=ANY($1::UUID[])`,[items.map(i=>i.id)]);}
 }
 return processed;
}

function recipientPurpose(input:Pick<WorkspaceEvent,'category'|'kind'|'recipientPurpose'>):'review'|'billing'|'updates'{
 if(input.recipientPurpose)return input.recipientPurpose;
 if(input.category==='billing')return 'billing';
 return /^(deliverable\.ready|work\.(version_ready|created)|review\.(requested|ready))$/.test(input.kind)?'review':'updates';
}
/** Read persisted primary contact every attempt; an inactive auth account cannot regain mail through the fallback. */
async function emailOnlyContact(identity:string,projectId:string,visibility:string,kind:string,tx:Queryable=db):Promise<{email:string;updates:boolean|null;reminders:boolean|null}|null>{
 if(visibility!=='client'||!identity.startsWith('client:'))return null;
 const id=identity.slice(7);
 const result=await tx.query<{email:string;updates:boolean|null;reminders:boolean|null}>(`SELECT trim(c.data->>'email') AS email,(c.data->'notify'->>'updates')::BOOL AS updates,(c.data->'notify'->>'reminders')::BOOL AS reminders FROM admin_records c LEFT JOIN admin_records p ON p.collection='PROJECTS' AND p.id=$2 AND p.data->>'clientId'=c.id WHERE c.collection='CLIENTS' AND c.id=$1 AND coalesce(c.data->>'archived','false')<>'true' AND ((p.id IS NOT NULL AND coalesce(p.data->>'archived','false')<>'true') OR ($2='client:'||c.id AND ($3='client.departments_changed' OR $3 LIKE 'billing.%' OR $3 LIKE 'support.%' OR $3='invitation.expiring_client'))) AND coalesce(c.data->>'mergedInto','')='' AND length(trim(c.data->>'email'))>0 AND NOT EXISTS(SELECT 1 FROM "user" u WHERE lower(u.email)=lower(trim(c.data->>'email')))`,[id,projectId,kind]);
 return result.rows[0]??null;
}
async function recipientStillAllowed(item:SendRow){
 if(item.kind.startsWith('invitation.')&&!await invitationEventCurrent(item.kind,item.stale_key,item.kind==='invitation.expiring_client'?item.email:null))return false;
 if(item.kind==='invitation.expiring_owner'||item.kind==='invitation.expired'){return activeOwner(item.user_id,db);}
 if(item.project_id==='client:'+item.client_id&&(item.kind.startsWith('billing.')||item.kind.startsWith('support.'))&&!item.user_id.startsWith('client:'))return clientLevelRecipient(item.user_id,item.client_id!,item.visibility,db);
 if(item.kind==='project.access_revoked'){const active=await db.query(`SELECT 1 FROM "user" WHERE id=$1 AND role IN ('owner','staff') AND "deactivatedAt" IS NULL`,[item.user_id]);return Boolean(active.rowCount); }
 if(item.kind==='client.department_assignment'){
  const result=await db.query(`SELECT 1 FROM department_members m JOIN "user" u ON u.id=m.user_id JOIN admin_records c ON c.collection='CLIENTS' AND c.id=$2 WHERE m.user_id=$1 AND u.role IN ('owner','staff') AND u."deactivatedAt" IS NULL AND coalesce(c.data->>'archived','false')<>'true' AND c.data->'departments' @> to_jsonb(ARRAY[m.department_id]::STRING[])`,[item.user_id,item.client_id]);return Boolean(result.rowCount);
 }
 if(item.kind==='client.departments_changed'&&item.project_id==='client:'+item.client_id&&!item.user_id.startsWith('client:')){
  const result=await db.query(`SELECT 1 FROM "user" u JOIN admin_records c ON c.collection='CLIENTS' AND c.id=$2 AND lower(c.data->>'email')=lower(u.email) WHERE u.id=$1 AND u.role='client' AND u."deactivatedAt" IS NULL AND coalesce(c.data->>'archived','false')<>'true'`,[item.user_id,item.client_id]);return Boolean(result.rowCount);
 }
 if(item.user_id.startsWith('client:')){const current=await emailOnlyContact(item.user_id,item.project_id,item.visibility,item.kind);return Boolean(current&&current.email.toLowerCase()===item.email.toLowerCase()&&current.updates!==false&&(item.category!=='reminders'||current.reminders!==false));}
 const allowed=await currentRecipients(item.project_id,item.category,item.visibility,item.recipient_purpose);return allowed.some(r=>r.userId===item.user_id);
}

/** Verify the committed project or department in the same transaction as the intent. */
async function eventRecipientAllowed(input:WorkspaceEvent,userId:string,tx:Queryable){
 if(input.kind.startsWith('invitation.')&&!await invitationEventCurrent(input.kind,input.staleKey,null,tx))return false;
 if(input.kind==='invitation.expiring_owner'||input.kind==='invitation.expired')return activeOwner(userId,tx);
 if(input.projectId==='client:'+input.clientId&&(input.kind.startsWith('billing.')||input.kind.startsWith('support.')||input.kind==='invitation.expiring_client'))return clientLevelRecipient(userId,input.clientId!,input.visibility,tx);
 if(input.kind==='project.access_revoked'){const active=await tx.query(`SELECT 1 FROM "user" WHERE id=$1 AND role IN ('owner','staff') AND "deactivatedAt" IS NULL`,[userId]);return Boolean(active.rowCount); }
 if(input.kind==='client.department_assignment'){
  const result=await tx.query(`SELECT 1 FROM department_members m JOIN "user" u ON u.id=m.user_id JOIN admin_records c ON c.collection='CLIENTS' AND c.id=$2 WHERE m.user_id=$1 AND u.role IN ('owner','staff') AND u."deactivatedAt" IS NULL AND coalesce(c.data->>'archived','false')<>'true' AND c.data->'departments' @> to_jsonb(ARRAY[m.department_id]::STRING[])`,[userId,input.clientId]);return Boolean(result.rowCount);
 }
 if(input.projectId==='client:'+input.clientId&&input.kind==='client.departments_changed'){
  const result=await tx.query(`SELECT 1 FROM "user" u JOIN admin_records c ON c.collection='CLIENTS' AND c.id=$2 AND lower(trim(c.data->>'email'))=lower(u.email) WHERE u.id=$1 AND u.role='client' AND u."deactivatedAt" IS NULL AND coalesce(c.data->>'archived','false')<>'true'`,[userId,input.clientId]);return Boolean(result.rowCount);
 }
 const result=await tx.query(`SELECT 1 FROM "user" u JOIN admin_records p ON p.collection='PROJECTS' AND p.id=$2 JOIN admin_records c ON c.collection='CLIENTS' AND c.id=p.data->>'clientId' LEFT JOIN workspace_project_members m ON m.project_id=p.id AND m.user_id=u.id AND m.revoked_at IS NULL WHERE u.id=$1 AND u."deactivatedAt" IS NULL AND coalesce(p.data->>'archived','false')<>'true' AND coalesce(c.data->>'archived','false')<>'true' AND (u.role='owner' OR (u.role='staff' AND (p.data->'ownerIds' @> to_jsonb(ARRAY[u.id]::STRING[]) OR m.user_id IS NOT NULL)) OR (u.role='client' AND $3='client' AND (lower(u.email)=lower(trim(c.data->>'email')) OR (m.user_id IS NOT NULL AND ($4='updates' OR ($4='review' AND m.can_review) OR ($4='billing' AND m.can_billing))))))`,[userId,input.projectId,input.visibility,recipientPurpose(input)]);return Boolean(result.rowCount);
}

async function activeOwner(id:string,tx:Queryable){const result=await tx.query(`SELECT 1 FROM "user" WHERE id=$1 AND role='owner' AND "deactivatedAt" IS NULL`,[id]);return Boolean(result.rowCount);}
async function clientLevelRecipient(id:string,clientId:string,visibility:string,tx:Queryable){
 const result=await tx.query(`SELECT 1 FROM "user" u JOIN admin_records c ON c.collection='CLIENTS' AND c.id=$2 WHERE u.id=$1 AND u."deactivatedAt" IS NULL AND coalesce(c.data->>'archived','false')<>'true' AND coalesce(c.data->>'mergedInto','')='' AND (u.role='owner' OR ($3='client' AND u.role='client' AND lower(u.email)=lower(trim(c.data->>'email'))))`,[id,clientId,visibility]);return Boolean(result.rowCount);
}
async function invitationEventCurrent(kind:string,staleKey:string|null|undefined,email:string|null,tx:Queryable=db){
 if(!staleKey?.startsWith('invitation:'))return false;
 const result=await tx.query(`SELECT 1 FROM invitations i WHERE i.id=$1 AND i.redeemed_at IS NULL AND i.revoked_at IS NULL AND NOT EXISTS(SELECT 1 FROM "user" u WHERE lower(u.email)=lower(i.email)) AND ($2::STRING IS NULL OR lower(i.email)=lower($2)) AND (($3='invitation.expired' AND i.expires_at<=now()) OR ($3<>'invitation.expired' AND i.expires_at>now() AND i.expires_at<=now()+INTERVAL '1 day'))`,[staleKey.slice(11),email,kind]);return Boolean(result.rowCount);
}
