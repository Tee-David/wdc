import {NextResponse} from "next/server";
import {getAdminRequest} from "@/lib/admin/session";
import {syncStore} from "@/lib/admin/persist";
import {getPaymentsFor} from "@/lib/admin/store";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const {session}=await getAdminRequest();
 if((session?.user as {role?:string}|undefined)?.role!=="owner")return new NextResponse("Not allowed",{status:403});
 await syncStore();const {id}=await params;
 const payment=getPaymentsFor(id).filter(p=>!p.reversed).sort((a,b)=>b.at.localeCompare(a.at))[0];
 if(!payment)return new NextResponse("There is no payment receipt for this invoice.",{status:404});
 return NextResponse.redirect(new URL(`/r/${encodeURIComponent(payment.token)}`,request.url));
}
