import 'server-only';
import { db } from '@/lib/db/pool';
import { requireProjectActor, projectRecipients } from './access';
export type Handover = {id:string;projectId:string;fromUserId:string;toUserId:string;fromName:string;toName:string;title:string;context:string;files:string;decisions:string;risks:string;nextAction:string;dueAt:string|null;acceptedAt:string|null};
export type TeamTask = {id:string;projectId:string;title:string;assigneeId:string;assigneeName:string;dueAt:string|null;priority:string;completedAt:string|null;handoverId:string|null;blockedBy:string|null;blocked:boolean};
export type TeamNote = {id:string;authorId:string;authorName:string;body:string;visibility:'client'|'internal';createdAt:string;replyTo:string|null};
export type TeamData = {handovers:Handover[];tasks:TeamTask[];notes:TeamNote[];staff:{id:string;name:string}[]};
export async function getWorkspaceTeam(projectId:string):Promise<TeamData> {
 const actor=await requireProjectActor(projectId,'read');
 const [handovers,tasks,notes]=await Promise.all([
  actor.kind==='client'?Promise.resolve({rows:[]}):db.query<Handover>(`SELECT h.id,h.project_id AS "projectId",h.from_user_id AS "fromUserId",h.to_user_id AS "toUserId",a.name AS "fromName",b.name AS "toName",h.title,h.context,h.files,h.decisions,h.risks,h.next_action AS "nextAction",h.due_at AS "dueAt",h.accepted_at AS "acceptedAt" FROM workspace_handovers h JOIN "user" a ON a.id=h.from_user_id JOIN "user" b ON b.id=h.to_user_id WHERE h.project_id=$1 ORDER BY h.created_at DESC LIMIT 50`,[projectId]),
  actor.kind==='client'?Promise.resolve({rows:[]}):db.query<TeamTask>(`SELECT t.id,t.project_id AS "projectId",t.title,t.assignee_id AS "assigneeId",u.name AS "assigneeName",t.due_at AS "dueAt",t.priority,t.completed_at AS "completedAt",t.handover_id AS "handoverId",t.blocked_by AS "blockedBy",((t.handover_id IS NOT NULL AND h.accepted_at IS NULL) OR(t.blocked_by IS NOT NULL AND d.completed_at IS NULL)) AS blocked FROM workspace_team_tasks t JOIN "user" u ON u.id=t.assignee_id LEFT JOIN workspace_handovers h ON h.id=t.handover_id LEFT JOIN workspace_team_tasks d ON d.id=t.blocked_by WHERE t.project_id=$1 ORDER BY t.completed_at NULLS FIRST,t.due_at NULLS LAST LIMIT 100`,[projectId]),
  db.query<TeamNote>(`SELECT id,author_id AS "authorId",author_name AS "authorName",reply_to AS "replyTo",body,visibility,created_at AS "createdAt" FROM workspace_team_notes WHERE project_id=$1 AND ($2=false OR visibility='client') ORDER BY created_at DESC LIMIT 80`,[projectId,actor.kind==='client'])
 ]);
 const ids=actor.kind==='client'?[]:(await projectRecipients(projectId,'internal')).map(r=>r.userId);
 const staff=ids.length?(await db.query<{id:string;name:string}>(`SELECT id,name FROM "user" WHERE id=ANY($1::STRING[]) AND role IN('owner','staff') AND "deactivatedAt" IS NULL ORDER BY name`,[ids])).rows:[];
 const date=(value:string|null)=>value?new Date(value).toISOString():null;
 return {handovers:handovers.rows.map(h=>({...h,dueAt:date(h.dueAt),acceptedAt:date(h.acceptedAt)})),tasks:tasks.rows.map(t=>({...t,dueAt:date(t.dueAt),completedAt:date(t.completedAt)})),notes:notes.rows.map(n=>({...n,createdAt:new Date(n.createdAt).toISOString()})),staff};
}
