import { redirect } from "next/navigation";
import { adminRole } from "@/lib/admin/guard";
import { MeetingsAdmin } from "@/components/meetings/admin";
export default async function MeetingsPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const role=await adminRole();if(!role)redirect("/login");if(role!=="owner")return <div className="ad__head"><div><h1>Meetings</h1><p>Studio meetings need scoped staff access. Ask the owner to arrange or change a meeting while delegation is being configured.</p></div></div>;const raw=await searchParams;const query=Object.fromEntries(Object.entries(raw).map(([key,value])=>[key,typeof value==="string"?value:undefined]));return <MeetingsAdmin key={JSON.stringify(query)} owner={role==="owner"} query={query}/>}
