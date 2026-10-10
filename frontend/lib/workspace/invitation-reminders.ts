import 'server-only';
import {createHash} from 'node:crypto';
import {db} from '@/lib/db/pool';
import {clientRecipients} from './access';
import {emitWorkspaceEvent} from './events';
const identity=(key:string)=>{const h=createHash('sha256').update(key).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;};
/** No login token is stored or recreated. The original invitation remains the only account link. */
export async function queueInvitationReminders(){
 const invitations=await db.query<{id:string;email:string;name:string;role:string;client_id:string|null;expires_at:Date;expired:boolean}>(`SELECT i.id,i.email,i.name,i.role,i.client_id,i.expires_at,i.expires_at<=now() AS expired FROM invitations i WHERE redeemed_at IS NULL AND revoked_at IS NULL AND expires_at<=now()+INTERVAL '1 day' AND expires_at>now()-INTERVAL '7 days' AND NOT EXISTS(SELECT 1 FROM "user" u WHERE lower(u.email)=lower(i.email)) ORDER BY expires_at LIMIT 100`);
 const owners=await db.query<{id:string}>(`SELECT id FROM "user" WHERE role='owner' AND "deactivatedAt" IS NULL`);
 let queued=0;
 for(const invitation of invitations.rows){
  const deadline=new Date(invitation.expires_at).toISOString(),staleKey='invitation:'+invitation.id;
  const kind=invitation.expired?'invitation.expired':'invitation.expiring_owner';
  await emitWorkspaceEvent({id:identity(invitation.id+':'+kind),projectId:'invitation:'+invitation.id,clientId:invitation.client_id??undefined,kind,category:'reminders',actorId:'invitation-scheduler',actorName:'Invitation reminders',title:invitation.expired?'An invitation expired':'An invitation expires soon',summary:`${invitation.name || invitation.email} has not accepted the ${invitation.role} invitation. ${invitation.expired?'It expired':'It expires'} at ${deadline}. Open Invitations, confirm the address, and choose Send again if access is still needed. This does not create or resend an account link automatically.`,href:'/admin/users?tab=invitations',visibility:'internal',recipients:owners.rows.map(owner=>({userId:owner.id})),dueAt:deadline,availableAt:new Date().toISOString(),staleKey});
  queued++;
  if(!invitation.expired&&invitation.role==='client'&&invitation.client_id){
   const people=await clientRecipients(invitation.client_id,'client');
   const recipients=people.filter(person=>person.email.trim().toLowerCase()===invitation.email.trim().toLowerCase()).map(person=>({userId:person.userId}));
   if(recipients.length){await emitWorkspaceEvent({id:identity(invitation.id+':invitation.expiring_client'),projectId:'client:'+invitation.client_id,clientId:invitation.client_id,kind:'invitation.expiring_client',category:'reminders',actorId:'invitation-scheduler',actorName:'Invitation reminders',title:'Your portal invitation expires soon',summary:`Your invitation expires at ${deadline}. Find the original WDC invitation email and use its account link before then. If you cannot find it, reply to the studio and ask for a new invitation. We never treat an unanswered invitation as acceptance. Invitation reminders follow your client reminder preferences; ask the studio to switch them off if you prefer.`,href:'/portal/projects',visibility:'client',recipients,dueAt:deadline,availableAt:new Date().toISOString(),staleKey});queued++;}
  }
 }
 return {checked:invitations.rowCount??0,queued};
}
