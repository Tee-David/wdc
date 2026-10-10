import 'server-only';
import { db } from '@/lib/db/pool';
import { requireWorkspaceUser, projectRecipients } from './access';
import { effectiveWorkspacePreferences } from './notifications-preferences';
import { syncStore } from '@/lib/admin/persist';
export type WorkspaceNotification = {id:string;projectId:string;title:string;summary:string;category:string;kind:string;href:string;visibility:string;createdAt:string;dueAt:string|null;readAt:string|null;actionedAt:string|null;cancelledAt:string|null;emailState:string|null;actorName:string};
export async function listWorkspaceNotifications(filter:'needs-me'|'all'|'summaries'='needs-me') {
 const person=await requireWorkspaceUser();
 await syncStore();
 const rows=await db.query<WorkspaceNotification>(`SELECT n.id,e.project_id AS "projectId",e.title,e.summary,e.category,e.kind,n.href,e.visibility,e.created_at AS "createdAt",e.due_at AS "dueAt",n.read_at AS "readAt",n.actioned_at AS "actionedAt",e.cancelled_at AS "cancelledAt",i.state AS "emailState",e.actor_name AS "actorName" FROM workspace_notifications n JOIN workspace_events e ON e.id=n.event_id LEFT JOIN workspace_email_intents i ON i.event_id=e.id AND i.user_id=n.user_id WHERE n.user_id=$1 ORDER BY n.created_at DESC LIMIT 150`,[person.id]);
 const permitted=[];
 const scopes=new Map<string,ReturnType<typeof projectRecipients>>();
 for(const row of rows.rows) {
  const audience=row.visibility==='internal'?'internal':'all',purpose=row.category==='billing'?'billing':row.category==='actions'?'review':'updates',key=`${row.projectId}:${audience}:${purpose}`;
  if(!scopes.has(key))scopes.set(key,projectRecipients(row.projectId,audience,purpose));
  const recipients=await scopes.get(key)!;
  if(!recipients.some(r=>r.userId===person.id))continue;
  if(filter==='needs-me'&&(row.actionedAt||row.cancelledAt||!['actions','reminders','support'].includes(row.category)))continue;
  if(filter==='summaries'&&row.kind!=='communication.summary')continue;
  permitted.push({...row,createdAt:new Date(row.createdAt).toISOString(),dueAt:row.dueAt?new Date(row.dueAt).toISOString():null,readAt:row.readAt?new Date(row.readAt).toISOString():null});
 }
 return permitted;
}
export async function getWorkspaceNotificationPreferences() {
 const person=await requireWorkspaceUser();
 const r=await db.query<{modes:unknown;digest_days:number}>('SELECT modes,digest_days FROM workspace_notification_preferences WHERE user_id=$1',[person.id]);
 await syncStore();return effectiveWorkspacePreferences(person.email,r.rows[0]?.modes,r.rows[0]?.digest_days);
}
