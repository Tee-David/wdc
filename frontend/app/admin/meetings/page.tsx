import { redirect } from "next/navigation";
import { adminRole } from "@/lib/admin/guard";
import { MeetingsAdmin } from "@/components/meetings/admin";
export default async function MeetingsPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const role=await adminRole();if(!role)redirect("/login");const raw=await searchParams;const query=Object.fromEntries(Object.entries(raw).map(([key,value])=>[key,typeof value==="string"?value:undefined]));return <MeetingsAdmin owner={role==="owner"} query={query}/>}
