import { redirect } from "next/navigation";
import { adminRole } from "@/lib/admin/guard";
import { MeetingSettings } from "@/components/meetings/settings";
export default async function SchedulingPage(){if(await adminRole()!=="owner")redirect("/admin");return <MeetingSettings/>}
