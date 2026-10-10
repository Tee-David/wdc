import {currencyOf} from "@/lib/money/currency";
import {NextResponse} from "next/server";
import {syncStore} from "@/lib/admin/persist";
import {getPaymentByToken,getInvoice,getClient,getProject,getSetting} from "@/lib/admin/store";
import {hydrateSettings} from "@/lib/settings/store";
import {renderReceiptPdf} from "@/lib/money/receipt-pdf";
import {receiptPdfName} from "@/lib/money/receipt-model";
import {rateLimit,callerKey} from "@/lib/rate-limit";
import type {NextRequest} from "next/server";
export const runtime="nodejs";
export async function GET(request:NextRequest,{params}:{params:Promise<{token:string}>}){
 const {token}=await params;
 if(!rateLimit(callerKey(request,"receipt-pdf"),20,60_000).ok)return new NextResponse("Try again shortly.",{status:429});
 if(!token || token.length>160)return new NextResponse("Not found",{status:404});
 await syncStore();await hydrateSettings();
 const payment=getPaymentByToken(token),invoice=payment?getInvoice(payment.invoiceId):null;
 if(!payment||!invoice)return new NextResponse("Not found",{status:404});
 const bytes=await renderReceiptPdf({payment,invoice,client:getClient(invoice.clientId),projectTitle:invoice.projectId?getProject(invoice.projectId)?.title??null:null,tin:getSetting("finance.tin")??"",footerNote:getSetting("finance.footerNote")??"",currency:currencyOf(invoice)});
 return new NextResponse(Buffer.from(bytes),{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="${receiptPdfName(payment.receiptNo)}"`,"Cache-Control":"private, no-store","X-Robots-Tag":"noindex, nofollow"}});
}
