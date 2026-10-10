import type {Approval,Deliverable} from '@/lib/admin/types';
/** Legacy current non-private states prove sharing, but never supply an invented share date. */
export function versionWasShared(deliverable:Deliverable,version:Deliverable['versions'][number]){
 return version.shared===true||Boolean(version.sharedAt)||(version.v===deliverable.versions.at(-1)?.v&&deliverable.approval!=='Not sent');
}
export function clientDeliverable(deliverable:Deliverable):Deliverable|null{
 const versions=deliverable.versions.filter(v=>versionWasShared(deliverable,v));const last=versions.at(-1);if(!last)return null;
 const current=last.v===deliverable.versions.at(-1)?.v;
 return {...deliverable,versions,clientReviewable:current&&deliverable.approval==='Awaiting client',approval:current?deliverable.approval:last.approval||'Not sent',approvalNote:current?deliverable.approvalNote:last.approvalNote,decisions:deliverable.decisions?.filter(d=>versions.some(v=>v.v===d.version))};
}
export function assertClientDecision(deliverable:Deliverable,submitted:string){
 if(!/^[1-9]\d*$/.test(submitted))throw Error('The exact version is required. Reload this page before deciding.');
 const seen=Number(submitted),latest=deliverable.versions.at(-1);
 if(!Number.isSafeInteger(seen)||!latest||seen!==latest.v)throw Error('The current version changed. Reload and review the latest shared work.');
 if(!versionWasShared(deliverable,latest)||!['Awaiting client','Approved','Revision requested'].includes(deliverable.approval))throw Error('This version has not been shared for your decision.');
 return latest;
}
export function recordDeliverableDecision(deliverable:Deliverable,decision:Approval,input:{actor?:string;actorId?:string;note?:string;at:string}){
 const latest=deliverable.versions.at(-1);if(!latest)throw Error('This deliverable has no version.');
 deliverable.approval=decision;deliverable.approvalNote=decision==='Revision requested'?input.note:undefined;latest.approval=decision;latest.approvalNote=deliverable.approvalNote;
 if(decision!=='Not sent'){latest.shared=true;if(decision==='Awaiting client'&&!latest.sharedAt){latest.sharedAt=input.at;latest.reviewDueAt=new Date(Date.parse(input.at)+7*86400000).toISOString();}}
 (deliverable.decisions??=[]).push({version:latest.v,decision,at:input.at,actor:input.actor,actorId:input.actorId,note:input.note});
 return deliverable;
}
