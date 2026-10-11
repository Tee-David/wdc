import type { Metadata } from "next";
import { ManageMeeting } from "@/components/meetings/manage";
import { BarePage } from "@/components/layout/bare-page";
import "@/components/admin/admin.css";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Manage your meeting",robots:{index:false,follow:false},alternates:{canonical:null},referrer:"no-referrer"};
export default async function ManagePage({params}:{params:Promise<{token:string}>}){const {token}=await params;return <BarePage><ManageMeeting token={token}/></BarePage>}
