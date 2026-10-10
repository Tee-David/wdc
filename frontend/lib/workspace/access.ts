import "server-only";
import { headers } from "next/headers";
import { db } from "@/lib/db/pool";
import { getAdminRequest } from "@/lib/admin/session";
import { getPortalRequest } from "@/lib/portal/session";
import { syncStore } from "@/lib/admin/persist";
import { getClient, getProject } from "@/lib/admin/store";
import type { Project,Client } from "@/lib/admin/types";
import { clientSupportCookiePresent, supportCookiePresent } from "@/lib/users/support";
import { SITE_URL } from "@/lib/site";
import { rateLimit } from "@/lib/rate-limit";

export type WorkspaceUser = { id:string; userId:string; name:string; email:string; role:"owner"|"staff"|"client"; kind:"client"|"staff"; readOnly:boolean; capture:boolean };
export type WorkspaceActor = WorkspaceUser & { project:Project; clientId:string; canManage:boolean; canReview:boolean; canBilling:boolean };
export type WorkspacePermission = "read"|"manage"|"review"|"billing"|"comment";
export type WorkspaceRecipient = { userId:string; email:string; name:string; role:"owner"|"staff"|"client"; clientId?:string; emailMode?:"immediate"|"digest"|"off" };
export class WorkspaceAccessError extends Error { constructor(message="You cannot access this project."){super(message);this.name="WorkspaceAccessError";} }

export async function requireWorkspaceUser(write=false):Promise<WorkspaceUser> {
  const h=await headers();
  const support=await supportCookiePresent();
  if(write && support)throw new WorkspaceAccessError("Exit the read-only support view first.");
  const admin=await getAdminRequest();
  const portal=await clientSupportCookiePresent() || (admin.capture && h.get("x-boneyard-capture-role")==="client") ? await getPortalRequest() : null;
  const request=portal ?? admin;
  const session=request.session;
  if(!session?.user)throw new WorkspaceAccessError("Sign in again, then retry.");
  const u=session.user as {id?:string;name?:string;email?:string;role?:string};
  if(u.role!=="owner" && u.role!=="staff" && u.role!=="client")throw new WorkspaceAccessError();
  const capture=Boolean(request.capture);
  const readOnly=capture || support;
  if(write && readOnly)throw new WorkspaceAccessError("This view is read-only.");
  if(write){
    const origin=h.get("origin"),host=h.get("x-forwarded-host")||h.get("host");
    let valid=false;
    try { const url=new URL(origin||""); const expected=new URL(SITE_URL);valid=Boolean(origin && host && url.host===host && (url.origin===expected.origin || (process.env.NODE_ENV!=="production" && ["localhost","127.0.0.1"].includes(url.hostname)))); } catch { /* Fail closed. */ }
    if(!valid)throw new WorkspaceAccessError("Reload this page, then try again.");
  }
  const userId=u.id || (capture?`capture-${u.role}`:"");
  if(!userId || !u.email)throw new WorkspaceAccessError("Sign in again, then retry.");
  if(!capture){const active=await db.query('SELECT 1 FROM "user" WHERE "id"=$1 AND "role"=$2 AND "deactivatedAt" IS NULL',[userId,u.role]);if(!active.rowCount)throw new WorkspaceAccessError("Your account access has ended.");}
  // Per-instance abuse control, not an account-wide quota.
  if(write && !rateLimit(`workspace:${userId}`,60,60_000).ok)throw new WorkspaceAccessError("Wait a minute, then retry.");
  return {id:userId,userId,name:u.name?.trim()||u.email,email:u.email.toLowerCase(),role:u.role,kind:u.role==="client"?"client":"staff",readOnly,capture};
}

export async function requireProjectActor(projectId:string,permission:WorkspacePermission="read"):Promise<WorkspaceActor> {
  if(!projectId || projectId.length>120)throw new WorkspaceAccessError();
  const user=await requireWorkspaceUser(permission!=="read");
  await syncStore();const project=getProject(projectId),client=project?getClient(project.clientId):null;
  if(!project || !client || client.mergedInto)throw new WorkspaceAccessError();
  let canRead=false,canManage=false,canReview=false,canBilling=false;
  if(user.role==="owner"){canRead=true;canManage=true;}
  else if(user.role==="staff" && project.ownerIds?.includes(user.userId)){canRead=true;canManage=true;}
  else if(user.role==="client" && user.email===client.email.toLowerCase()){canRead=true;canReview=true;canBilling=true;}
  else {
    const result=await db.query<{can_manage:boolean;can_review:boolean;can_billing:boolean}>(`SELECT can_manage,can_review,can_billing FROM workspace_project_members WHERE project_id=$1 AND user_id=$2 AND revoked_at IS NULL`,[project.id,user.userId]);
    const member=result.rows[0];if(member){canRead=true;canManage=user.role!=="client" && member.can_manage;canReview=user.role==="client" && member.can_review;canBilling=user.role==="client" && member.can_billing;}
  }
  if(!canRead || (permission==="manage" && !canManage) || (permission==="review" && !canReview) || (permission==="billing" && !canBilling))throw new WorkspaceAccessError();
  if(permission!=="read" && (project.archived || client.archived))throw new WorkspaceAccessError("This project is archived. Restore it before making changes.");
  return {...user,project,clientId:project.clientId,canManage:canManage&&!user.readOnly,canReview:canReview&&!user.readOnly,canBilling:canBilling&&!user.readOnly};
}

export async function projectRecipients(projectId:string,audience:"client"|"internal"|"all",purpose:"review"|"billing"|"updates"="updates",synchronize=true):Promise<WorkspaceRecipient[]> {
  if(synchronize)await syncStore();const project=getProject(projectId),client=project?getClient(project.clientId):null;
  if(!project || !client)return [];
  return projectRecipientsForRecord(project,client,audience,purpose);
}
export async function projectRecipientsForRecord(project:Project,client:Client,audience:"client"|"internal"|"all",purpose:"review"|"billing"|"updates"="updates"):Promise<WorkspaceRecipient[]> {
  if(client.archived || project.archived)return [];
  const rows=await db.query<WorkspaceRecipient & {member_review:boolean;member_billing:boolean;owner_id:boolean;primary_client:boolean}>(`
    SELECT u."id" AS "userId",u."email" AS email,u."name" AS name,u."role" AS role,
      coalesce(m.can_review,false) AS member_review,coalesce(m.can_billing,false) AS member_billing,
      u."id"=ANY($2::STRING[]) AS owner_id,lower(u."email")=$3 AS primary_client
    FROM "user" u LEFT JOIN workspace_project_members m ON m.user_id=u."id" AND m.project_id=$1 AND m.revoked_at IS NULL
    WHERE u."deactivatedAt" IS NULL AND ((u."role"='client' AND (lower(u."email")=$3 OR m.user_id IS NOT NULL))
      OR u."role"='owner' OR (u."role"='staff' AND (u."id"=ANY($2::STRING[]) OR m.user_id IS NOT NULL)))
  `,[project.id,project.ownerIds||[],client.email.toLowerCase()]);
  const recipients=rows.rows.filter(r=>(audience==="all" || (audience==="client" ? r.role==="client" : r.role!=="client")) && (r.role!=="client" || purpose==="updates" || r.primary_client || (purpose==="review"?r.member_review:r.member_billing))).map(({userId,email,name,role})=>({userId,email,name,role}));
  if(audience!=='internal' && client.email.trim()) {
    const accounts=await db.query('SELECT 1 FROM "user" WHERE lower(email)=$1',[client.email.trim().toLowerCase()]);
    if(!accounts.rowCount)recipients.push({userId:'client:'+client.id,email:client.email,name:client.name,role:'client'});
  }
  return recipients;
}

/** Company-level notices never use secondary project membership as company access. */
export async function clientRecipients(clientId:string,audience:"client"|"internal"|"all"="all"):Promise<WorkspaceRecipient[]>{
 await syncStore();const client=getClient(clientId);if(!client||client.archived||client.mergedInto)return [];
 const rows=await db.query<WorkspaceRecipient>(`SELECT id AS "userId",email,name,role FROM "user" WHERE "deactivatedAt" IS NULL AND (role='owner' OR (role='client' AND lower(email)=$1))`,[client.email.trim().toLowerCase()]);
 const people=rows.rows.filter(person=>audience==='all'||(audience==='client'?person.role==='client':person.role==='owner'));
 if(audience!=='internal'&&client.email.trim()){const existing=await db.query('SELECT 1 FROM "user" WHERE lower(email)=$1',[client.email.trim().toLowerCase()]);if(!existing.rowCount)people.push({userId:'client:'+client.id,email:client.email,name:client.name,role:'client'});}
 return people;
}
