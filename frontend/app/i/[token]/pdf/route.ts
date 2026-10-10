import {NextResponse,type NextRequest} from "next/server";
import {syncStore} from "@/lib/admin/persist";
import {getInvoiceByToken,getClient,getProject,getSetting,getPaymentsFor} from "@/lib/admin/store";
import {hydrateSettings} from "@/lib/settings/store";
import {renderFinancialDocumentPdf} from "@/lib/money/receipt-pdf";
import {rateLimit,callerKey} from "@/lib/rate-limit";
export const runtime="nodejs";
export async function GET(request:NextRequest,{params}:{params:Promise<{token:string}>}){
 if(!rateLimit(callerKey(request,"money-pdf"),20,60_000).ok)return new NextResponse("Try again shortly.",{status:429});
 const {token}=await params;if(!token||token.length>160)return new NextResponse("Not found",{status:404});
 await syncStore();await hydrateSettings();const record=getInvoiceByToken(token);
 if(!record||record.status==="Draft")return new NextResponse("Not found",{status:404});
 const bytes=await renderFinancialDocumentPdf({record,kind:"Invoice",client:getClient(record.clientId),projectTitle:record.projectId?getProject(record.projectId)?.title??null:null,tin:getSetting("finance.tin")??"",footerNote:getSetting("finance.footerNote")??"",currency:record.currency??"NGN",payments:getPaymentsFor(record.id)});
 return new NextResponse(Buffer.from(bytes),{headers:{"Content-Type":"application/pdf","Content-Disposition":`${request.nextUrl.searchParams.get("print")==="1"?"inline":"attachment"}; filename="invoice-${record.number.replace(/[^a-zA-Z0-9_-]/g,"-")}.pdf"`,"Cache-Control":"private, no-store","X-Robots-Tag":"noindex, nofollow"}});
}
