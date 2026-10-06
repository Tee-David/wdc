import type { Metadata } from "next";
import { ManageMeeting } from "@/components/meetings/manage";
import "@/components/admin/admin.css";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Manage your meeting",robots:{index:false,follow:false},alternates:{canonical:null},referrer:"no-referrer"};
export default async function ManagePage({params}:{params:Promise<{token:string}>}){const {token}=await params;return <main id="main" style={{padding:"32px 16px"}}><ManageMeeting token={token}/></main>}
