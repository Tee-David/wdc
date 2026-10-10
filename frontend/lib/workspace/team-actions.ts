'use server';
import { randomUUID } from 'node:crypto';
import { after } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/pool';
import { FAIL,OK,type ActionState } from '@/lib/admin/validate';
import { requireProjectActor,projectRecipients } from './access';
import { workspaceTransaction,emitWorkspaceEvent,dispatchWorkspaceEvents,cancelWorkspaceEvents,type Queryable, type WorkspaceEvent,type WorkspaceRecipient } from './events';
import {assertTeamActor,assertTeamRecipient} from './team-guard';
import { dueDate } from './notifications-policy';
const value=(fd:FormData,key:string)=>String(fd.get(key)??'').trim();
function refresh(projectId:string){revalidatePath(`/admin/projects/${projectId}`);revalidatePath(`/portal/projects/${projectId}`);revalidatePath('/admin');}
async function staffRecipient(projectId:string,userId:string) {
 const eligible=await projectRecipients(projectId,'internal');if(!eligible.some(r=>r.userId===userId))throw new Error('Choose an active staff member who has access to this project.');
 const found=await db.query(`SELECT id FROM "user" WHERE id=$1 AND role IN('owner','staff') AND "deactivatedAt" IS NULL`,[userId]);if(!found.rowCount)throw new Error('Choose an active staff account.');
 return [{userId}];
}
async function event(input:Omit<WorkspaceEvent,'id'>,tx:Queryable,ids:string[]) {const id=randomUUID();await emitWorkspaceEvent({...input,id},tx);ids.push(id);}
function schedule(ids:string[],projectId:string){after(()=>dispatchWorkspaceEvents({eventIds:ids}));refresh(projectId);}
export async function createWorkspaceHandover(_prev:ActionState,fd:FormData):Promise<ActionState> {
 try {
  const projectId=value(fd,'projectId'),actor=await requireProjectActor(projectId,'manage'),to=value(fd,'toUserId'),title=value(fd,'title'),context=value(fd,'context'),nextAction=value(fd,'nextAction');
  if(!title||title.length>200||!context||context.length>3000||!nextAction||nextAction.length>1000)return FAIL({},'Give the handover a title, context and clear next action.');
  if(actor.kind==='client')return FAIL({},'Only the studio can hand work between teams.');
  const recipients=await staffRecipient(projectId,to),due=dueDate(value(fd,'dueAt')),id=randomUUID(),events:string[]=[];
  await workspaceTransaction(async tx=>{
   const current=await assertTeamActor(tx,actor,true);await assertTeamRecipient(tx,current.project,to);
   await tx.query(`INSERT INTO workspace_handovers(id,project_id,from_user_id,to_user_id,title,context,files,decisions,risks,next_action,due_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,[id,projectId,actor.id,to,title,context,value(fd,'files').slice(0,3000),value(fd,'decisions').slice(0,3000),value(fd,'risks').slice(0,3000),nextAction,due]);
   await event({projectId,clientId:actor.clientId,kind:'team.handover_requested',category:'actions',actorId:actor.id,actorName:actor.name,title:`Handover needs your acceptance: ${title}`,summary:`${context}\nNext action: ${nextAction}`,href:`/admin/projects/${projectId}?workspace=team#handover-${id}`,visibility:'internal',recipients,dueAt:due,staleKey:`handover:${id}`},tx,events);
  });schedule(events,projectId);return OK('Saved the handover. The receiving lead will be notified.');
 }catch(error){return FAIL({},error instanceof Error?error.message:'The handover could not be saved.');}
}
export async function acceptWorkspaceHandover(_prev:ActionState,fd:FormData):Promise<ActionState> {
 try {
  const projectId=value(fd,'projectId'),actor=await requireProjectActor(projectId,'comment'),id=value(fd,'id'),events:string[]=[];
  await workspaceTransaction(async tx=>{
   await assertTeamActor(tx,actor);
   const r=await tx.query<{to_user_id:string;from_user_id:string;title:string;accepted_at:Date|null}>(`SELECT * FROM workspace_handovers WHERE id=$1 AND project_id=$2 FOR UPDATE`,[id,projectId]);const h=r.rows[0];if(!h||h.to_user_id!==actor.id||actor.kind==='client')throw new Error('Only the assigned receiving lead can accept this handover.');if(h.accepted_at)throw new Error('This handover is already accepted.');
   await tx.query('UPDATE workspace_handovers SET accepted_at=now(),accepted_by=$2 WHERE id=$1',[id,actor.id]);await cancelWorkspaceEvents(projectId,`handover:${id}`,tx);
   await event({projectId,clientId:actor.clientId,kind:'team.handover_accepted',category:'progress',actorId:actor.id,actorName:actor.name,title:`Handover accepted: ${h.title}`,summary:`${actor.name} accepted the context and next action. Dependent work can now start.`,href:`/admin/projects/${projectId}?workspace=team#handover-${id}`,visibility:'internal',recipients:[{userId:h.from_user_id}]},tx,events);
   const tasks=await tx.query<{id:string;title:string;assignee_id:string}>(`SELECT id,title,assignee_id FROM workspace_team_tasks WHERE handover_id=$1 AND completed_at IS NULL`,[id]);
   for(const task of tasks.rows)await event({projectId,clientId:actor.clientId,kind:'task.unblocked',category:'actions',actorId:actor.id,actorName:actor.name,title:`You can start: ${task.title}`,summary:'The receiving lead accepted the handover. Open the task and check any other dependency.',href:`/admin/projects/${projectId}?workspace=team#task-${task.id}`,visibility:'internal',recipients:[{userId:task.assignee_id}],staleKey:`task:${task.id}`},tx,events);
  });schedule(events,projectId);return OK('Accepted the handover and notified the people who can start.');
 }catch(error){return FAIL({},error instanceof Error?error.message:'The handover could not be accepted.');}
}
export async function saveWorkspaceTask(_prev:ActionState,fd:FormData):Promise<ActionState> {
 try {
  const projectId=value(fd,'projectId'),actor=await requireProjectActor(projectId,'manage'),assignee=value(fd,'assigneeId'),title=value(fd,'title'),id=value(fd,'id')||randomUUID(),due=dueDate(value(fd,'dueAt')),priority=value(fd,'priority')||'Normal',handover=value(fd,'handoverId')||null,blockedBy=value(fd,'blockedBy')||null,events:string[]=[];
  if(actor.kind==='client'||!title||title.length>200||!['Low','Normal','High'].includes(priority)||blockedBy===id)return FAIL({},'Choose a title, active staff account and valid priority. A task cannot depend on itself.');
  const recipients=await staffRecipient(projectId,assignee);
  await workspaceTransaction(async tx=>{
   const current=await assertTeamActor(tx,actor,true);await assertTeamRecipient(tx,current.project,assignee);
   if(handover&&!(await tx.query('SELECT id FROM workspace_handovers WHERE id=$1 AND project_id=$2',[handover,projectId])).rowCount)throw new Error('Choose a handover from this project.');
   if(blockedBy) {
    const dependency=await tx.query(`SELECT id FROM workspace_team_tasks WHERE id=$1 AND project_id=$2`,[blockedBy,projectId]);if(!dependency.rowCount)throw new Error('Choose a dependency from this project.');
    const cycle=await tx.query(`WITH RECURSIVE chain AS (SELECT id,blocked_by FROM workspace_team_tasks WHERE id=$1 UNION ALL SELECT t.id,t.blocked_by FROM workspace_team_tasks t JOIN chain c ON t.id=c.blocked_by) SELECT id FROM chain WHERE id=$2 LIMIT 1`,[blockedBy,id]);if(cycle.rowCount)throw new Error('That dependency would make a cycle.');
   }
   const existing=await tx.query<{project_id:string;assignee_id:string}>('SELECT project_id,assignee_id FROM workspace_team_tasks WHERE id=$1 FOR UPDATE',[id]);if(existing.rows[0]&&existing.rows[0].project_id!==projectId)throw new Error('That task does not belong to this project.');
   await tx.query(`INSERT INTO workspace_team_tasks(id,project_id,title,assignee_id,due_at,priority,handover_id,blocked_by,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(id) DO UPDATE SET title=excluded.title,assignee_id=excluded.assignee_id,due_at=excluded.due_at,priority=excluded.priority,handover_id=excluded.handover_id,blocked_by=excluded.blocked_by,updated_at=now()`,[id,projectId,title,assignee,due,priority,handover,blockedBy,actor.id]);
   await cancelWorkspaceEvents(projectId,`task:${id}`,tx);
   await event({projectId,clientId:actor.clientId,kind:existing.rowCount?'task.changed':'task.assigned',category:'actions',actorId:actor.id,actorName:actor.name,title:`${existing.rowCount?'Task updated':'Task assigned'}: ${title}`,summary:`${priority} priority.${handover?' Wait for handover acceptance.':''}${blockedBy?' Wait for the dependent task.':''}`,href:`/admin/projects/${projectId}?workspace=team#task-${id}`,visibility:'internal',recipients,dueAt:due,staleKey:`task:${id}`},tx,events);
   if(existing.rows[0]&&existing.rows[0].assignee_id!==assignee)await event({projectId,clientId:actor.clientId,kind:'task.reassigned',category:'progress',actorId:actor.id,actorName:actor.name,title:`Your task was reassigned: ${title}`,summary:'The project lead selected a new responsible staff account.',href:`/admin/projects/${projectId}?workspace=team#task-${id}`,visibility:'internal',recipients:[{userId:existing.rows[0].assignee_id}]},tx,events);
  });schedule(events,projectId);return OK('Saved the task and its responsible person.');
 }catch(error){return FAIL({},error instanceof Error?error.message:'The task could not be saved.');}
}
export async function completeWorkspaceTask(_prev:ActionState,fd:FormData):Promise<ActionState> {
 try {
  const projectId=value(fd,'projectId'),actor=await requireProjectActor(projectId,'comment'),id=value(fd,'id'),events:string[]=[];
  const leads=await projectRecipients(projectId,'internal');
  await workspaceTransaction(async tx=>{
   const current=await assertTeamActor(tx,actor);
   const r=await tx.query<{assignee_id:string;title:string;completed_at:Date|null;handover_id:string|null;blocked_by:string|null}>('SELECT * FROM workspace_team_tasks WHERE id=$1 AND project_id=$2 FOR UPDATE',[id,projectId]);const task=r.rows[0];if(!task||actor.kind==='client'||(task.assignee_id!==actor.id&&!current.canManage))throw new Error('Only the assignee or project lead can complete this task.');if(task.completed_at)throw new Error('This task is already complete.');
   if(task.handover_id&&!(await tx.query('SELECT id FROM workspace_handovers WHERE id=$1 AND accepted_at IS NOT NULL',[task.handover_id])).rowCount)throw new Error('The handover must be accepted first.');
   if(task.blocked_by&&!(await tx.query('SELECT id FROM workspace_team_tasks WHERE id=$1 AND completed_at IS NOT NULL',[task.blocked_by])).rowCount)throw new Error('Complete the dependent task first.');
   await tx.query('UPDATE workspace_team_tasks SET completed_at=now(),updated_at=now() WHERE id=$1',[id]);await cancelWorkspaceEvents(projectId,`task:${id}`,tx);
   await event({projectId,clientId:actor.clientId,kind:'task.completed',category:'progress',actorId:actor.id,actorName:actor.name,title:`Task completed: ${task.title}`,summary:`${actor.name} completed the task.`,href:`/admin/projects/${projectId}?workspace=team#task-${id}`,visibility:'internal',recipients:leads},tx,events);
   const next=await tx.query<{id:string;title:string;assignee_id:string}>('SELECT id,title,assignee_id FROM workspace_team_tasks WHERE blocked_by=$1 AND completed_at IS NULL',[id]);
   for(const t of next.rows)await event({projectId,clientId:actor.clientId,kind:'task.unblocked',category:'actions',actorId:actor.id,actorName:actor.name,title:`You can start: ${t.title}`,summary:'The dependent task is complete. Check the handover and start your next step.',href:`/admin/projects/${projectId}?workspace=team#task-${t.id}`,visibility:'internal',recipients:[{userId:t.assignee_id}],staleKey:`task:${t.id}`},tx,events);
  });schedule(events,projectId);return OK('Completed the task and notified the next responsible people.');
 }catch(error){return FAIL({},error instanceof Error?error.message:'The task could not be completed.');}
}
export async function addWorkspaceTeamNote(_prev:ActionState,fd:FormData):Promise<ActionState> {
 try {
  const projectId=value(fd,'projectId'),actor=await requireProjectActor(projectId,'comment'),body=value(fd,'body'),visibility=value(fd,'visibility'),handover=value(fd,'handoverId')||null,mention=value(fd,'mentionUserId')||null,replyTo=value(fd,'replyTo')||null,id=randomUUID(),events:string[]=[];
  if(!body||body.length>5000||!['client','internal'].includes(visibility)||actor.kind==='client')return FAIL({},'Write a note and deliberately choose internal or client sharing.');
  if(visibility==='client'&&!actor.canManage)return FAIL({},'Only the project lead can publish a client update.');
  let recipients:WorkspaceRecipient[]=await projectRecipients(projectId,visibility==='internal'?'internal':'all');
  if(mention)recipients=await staffRecipient(projectId,mention);
  await workspaceTransaction(async tx=>{
   const current=await assertTeamActor(tx,actor,visibility==='client');if(mention)await assertTeamRecipient(tx,current.project,mention);
   if(handover&&!(await tx.query('SELECT id FROM workspace_handovers WHERE id=$1 AND project_id=$2',[handover,projectId])).rowCount)throw new Error('Choose a handover from this project.');
   if(replyTo){const parent=await tx.query<{author_id:string;visibility:string}>('SELECT author_id,visibility FROM workspace_team_notes WHERE id=$1 AND project_id=$2',[replyTo,projectId]);if(!parent.rows[0]||parent.rows[0].visibility!==visibility)throw new Error('A reply must keep the original note’s visibility.');const person=(await projectRecipients(projectId,visibility==='internal'?'internal':'all')).find(r=>r.userId===parent.rows[0].author_id);if(person)recipients=[...recipients,person];}
   await tx.query('INSERT INTO workspace_team_notes(id,project_id,handover_id,author_id,author_name,visibility,body,mention_user_id,reply_to) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[id,projectId,handover,actor.id,actor.name,visibility,body,mention,replyTo]);
   await event({projectId,clientId:actor.clientId,kind:replyTo?'team.note_replied':visibility==='client'?'project.update_published':'team.note_added',category:mention||replyTo?'actions':'progress',actorId:actor.id,actorName:actor.name,title:replyTo?'A project note has a reply':mention?'A colleague needs your attention':visibility==='client'?'A project update is ready':'An internal project note was added',summary:body.slice(0,3000),href:`/admin/projects/${projectId}?workspace=team#note-${id}`,visibility:visibility as 'internal'|'client',recipients},tx,events);
  });schedule(events,projectId);return OK(visibility==='client'?'Published the client update.':'Saved the internal note.');
 }catch(error){return FAIL({},error instanceof Error?error.message:'The note could not be saved.');}
}
