'use server';
import {randomUUID} from 'node:crypto';
import {after} from 'next/server';
import {revalidatePath} from 'next/cache';
import {db} from '@/lib/db/pool';
import type {ActionState} from '@/lib/admin/validate';
import {requireProjectActor,projectRecipients} from './access';
import {emitWorkspaceEvent,dispatchWorkspaceEvents,cancelWorkspaceEvents} from './events';
import {actOnServiceRecord,listServiceRecords,saveServiceRecord,type ServiceEmitter} from './service-store';
import {SERVICE_KINDS,type WorkspaceService} from './service-model';
const text=(fd:FormData,key:string)=>String(fd.get(key)||'');
const integer=(fd:FormData,key:string)=>{const n=Number(text(fd,key));if(!Number.isSafeInteger(n)||n<0)throw Error('Invalid record version.');return n;};
function refresh(projectId:string){revalidatePath('/admin/projects/'+projectId);revalidatePath('/portal/projects/'+projectId);}
export async function saveServiceItem(_previous:ActionState,fd:FormData):Promise<ActionState>{
 try{const projectId=text(fd,'projectId');const actor=await requireProjectActor(projectId,'manage');const service=text(fd,'service') as WorkspaceService;if(service!==actor.project.service&&!(actor.project.service==='social'&&service==='ads'))throw Error('This service does not belong to this project.');const kind=SERVICE_KINDS.find(k=>k.key===text(fd,'kind'));if(!kind)throw Error('Choose a type of work.');const financialKind=['budget','change','renewal'].includes(kind.key);const recipients=(await projectRecipients(projectId,text(fd,'visibility')==='shared'?'all':'internal',financialKind?'billing':'review')).filter(r=>!financialKind||r.role!=='staff');const eventIds:string[]=[];
 const emit:ServiceEmitter=async(c,event)=>{const staleKey='service:'+event.itemId;await cancelWorkspaceEvents(projectId,staleKey,c);const id=randomUUID();eventIds.push(id);await emitWorkspaceEvent({id,projectId,clientId:actor.clientId,kind:event.kind,category:kind.key==='budget'||kind.key==='change'||kind.key==='renewal'?'billing':'actions',actorId:actor.userId,actorName:actor.name,title:event.title,summary:event.visibility==='shared'?`Version ${event.version} is ready. Review the work and its next step.`:'New internal work needs the assigned team.',href:'/admin/projects/'+projectId,visibility:event.visibility==='shared'?'client':'internal',recipients,dueAt:event.visibility==='shared'?event.due:undefined,staleKey},c);};
 if(['budget','change','renewal'].includes(kind.key)&&actor.role!=='owner')throw Error('The owner prepares financial scope, spending and renewal terms.');const data=Object.fromEntries(kind.fields.map(f=>[f.key,text(fd,'data.'+f.key)]));await saveServiceRecord({projectId,id:text(fd,'id')||undefined,revision:integer(fd,'revision'),service,kind:kind.key,title:text(fd,'title'),visibility:text(fd,'visibility') as 'shared'|'internal',data},actor,emit);
 after(()=>dispatchWorkspaceEvents({eventIds}));refresh(projectId);return {ok:true,message:'Saved'};
 }catch(error){return {ok:false,message:error instanceof Error?error.message:'Work could not be saved.'};}
}
export async function serviceItemAction(_previous:ActionState,fd:FormData):Promise<ActionState>{
 try{const projectId=text(fd,'projectId'),action=text(fd,'action');await requireProjectActor(projectId,'read');const found=await db.query<{kind:string}>('SELECT kind FROM workspace_service_items WHERE id=$1 AND project_id=$2',[text(fd,'id'),projectId]);const financial=['budget','change','renewal'].includes(found.rows[0]?.kind);const permission=action==='decide'?(financial?'billing':'review'):['state','resolve'].includes(action)?'manage':'comment';const actor=await requireProjectActor(projectId,permission);const recipients=(await projectRecipients(projectId,'all',financial?'billing':'updates')).filter(r=>!financial||r.role!=='staff'),eventIds:string[]=[];
 const emit:ServiceEmitter=async(c,event)=>{if(action==='decide'||action==='respond'||['work.published','work.launched','work.released','work.running'].includes(event.kind))await cancelWorkspaceEvents(projectId,'service:'+event.itemId,c);const id=randomUUID();eventIds.push(id);await emitWorkspaceEvent({id,projectId,clientId:actor.clientId,kind:event.kind,category:financial?'billing':event.kind.startsWith('review')||event.kind==='request.supplied'?'actions':'progress',actorId:actor.userId,actorName:actor.name,title:event.kind==='work.published'?`Published: ${event.title}`:event.title,summary:event.kind==='work.published'&&text(fd,'publicationUrl').trim()?`It is live now: ${text(fd,'publicationUrl').trim()}`:`${actor.name} recorded ${event.kind.split('.').pop()?.replaceAll('_',' ')} on version ${event.version}.`,href:'/admin/projects/'+projectId,visibility:event.visibility==='shared'?'client':'internal',recipients:event.visibility==='internal'?recipients.filter(r=>r.role!=='client'):recipients},c);};
 if(financial&&actor.role!=='owner'&&!(actor.kind==='client'&&actor.canBilling))throw Error('Only the owner and authorised billing contact can access these financial terms.');await actOnServiceRecord({projectId,id:text(fd,'id'),revision:integer(fd,'revision'),version:integer(fd,'version'),action,state:text(fd,'state'),note:text(fd,'note'),context:text(fd,'context'),noteId:text(fd,'noteId'),evidence:text(fd,'evidence'),publicationUrl:text(fd,'publicationUrl'),publishedAt:text(fd,'publishedAt'),actual:text(fd,'actual')},actor,emit);after(()=>dispatchWorkspaceEvents({eventIds}));refresh(projectId);return {ok:true,message:'Updated'};
 }catch(error){return {ok:false,message:error instanceof Error?error.message:'This change could not be saved.'};}
}

/**
 * SEND THE READY POSTS FOR APPROVAL AS ONE BATCH (owner, 2026-10-25: "posts
 * ready to approve, one email per batch"). Every post still with the team
 * (draft or in review, not yet shared) becomes a shared version waiting on the
 * client, exactly as sharing it alone would, but the client hears once, with
 * the list, rather than once per post.
 */
export async function sendPostsForApproval(projectId:string):Promise<ActionState>{
 try{
  const actor=await requireProjectActor(String(projectId??''),'manage');
  if(actor.kind!=='staff')throw Error('Only the studio sends work for approval.');
  const ready=(await listServiceRecords(projectId,false)).filter(r=>r.kind==='post'&&r.visibility==='internal'&&['draft','internal_review'].includes(r.state));
  if(!ready.length)return {ok:false,message:'No post is waiting to be sent. Add posts, or move them back to draft first.'};
  const quiet:ServiceEmitter=async()=>{};
  for(const r of ready)await saveServiceRecord({projectId,id:r.id,revision:r.revision,service:r.service as WorkspaceService,kind:'post',title:r.title,visibility:'shared',data:r.data},actor,quiet);
  const recipients=await projectRecipients(projectId,'all','review'),id=randomUUID();
  const lines=ready.slice(0,12).map(r=>`• ${r.title}${r.data.platform?` (${r.data.platform})`:''}${r.data.plannedAt?`, planned ${r.data.plannedAt.replace('T',' ')}`:''}`).join('\n');
  await emitWorkspaceEvent({id,projectId,clientId:actor.clientId,kind:'review.batch_ready',category:'actions',actorId:actor.userId,actorName:actor.name,
   title:`${ready.length} ${ready.length===1?'post is':'posts are'} ready for your approval`,summary:`${lines}${ready.length>12?`\nand ${ready.length-12} more`:''}\nApprove each one, or ask for changes with a note.`,
   href:'/admin/projects/'+projectId+'?tab=approvals',visibility:'client',recipients,dueAt:new Date(Date.now()+2*86_400_000).toISOString(),staleKey:'batch:'+projectId});
  after(()=>dispatchWorkspaceEvents({eventIds:[id]}));refresh(projectId);
  return {ok:true,message:`Updated. ${ready.length} ${ready.length===1?'post is':'posts are'} with the client, in one email.`};
 }catch(error){return {ok:false,message:error instanceof Error?error.message:'The posts could not be sent.'};}
}
