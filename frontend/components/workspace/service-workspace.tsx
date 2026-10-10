import type {Project} from '@/lib/admin/types';
import type {WorkspaceActor} from '@/lib/workspace/access';
import {listServiceRecords} from '@/lib/workspace/service-store';
import {ServiceWorkspaceView} from './service-workspace-view';
import type {ServiceRecord} from '@/lib/workspace/service-model';
export async function ServiceWorkspace({project,actor}:{project:Pick<Project,'id'|'title'|'service'>;actor:WorkspaceActor}){
 let records:ServiceRecord[]=[],message='';
 const canFinance=actor.role==='owner'||(actor.kind==='client'&&actor.canBilling);
 try {records=await listServiceRecords(project.id,actor.kind==='client');if(!canFinance)records=records.filter(r=>!['budget','change','renewal'].includes(r.kind));}
 catch(error){message=(error as {code?:string}).code==='42P01'?'Apply the service workspace migration from Settings, System to begin.':'The workspace could not be loaded. Refresh to try again; no work has been replaced.';}
 if(message)return <div className="ad__panel" role="alert"><h2>Service workspace unavailable</h2><p>{message}</p></div>;
 return <ServiceWorkspaceView project={{id:project.id,title:project.title,service:project.service}} actor={{kind:actor.kind,name:actor.name,canManage:actor.canManage,canReview:actor.canReview,canBilling:actor.canBilling,canFinance,readOnly:actor.readOnly}} records={records}/>;
}
