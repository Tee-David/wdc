/** Per-project permission projection; no client-wide rights come from a secondary membership. */
export function portalScope(projects:readonly {id:string;clientId:string}[],primaryClientId:string|null,members:readonly {project_id:string;can_billing:boolean;can_review:boolean}[]) {
 const existing=new Set(projects.map(p=>p.id)),primary=primaryClientId?projects.filter(p=>p.clientId===primaryClientId).map(p=>p.id):[];
 const allowedProjectIds=[...new Set([...primary,...members.filter(m=>existing.has(m.project_id)).map(m=>m.project_id)])];
 return {isPrimaryContact:Boolean(primaryClientId),allowedProjectIds,billingProjectIds:[...new Set([...primary,...members.filter(m=>m.can_billing&&existing.has(m.project_id)).map(m=>m.project_id)])],reviewProjectIds:[...new Set([...primary,...members.filter(m=>m.can_review&&existing.has(m.project_id)).map(m=>m.project_id)])]};
}
