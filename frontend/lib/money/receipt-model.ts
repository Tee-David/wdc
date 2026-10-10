import {invoiceTotals,paymentNet,refundedTotal,type Invoice,type Payment,type Client} from '@/lib/admin/types';
import {SITE_URL} from '@/lib/site';
export type ReceiptDocument={payment:Payment;invoice:Invoice;client:Client|null;projectTitle:string|null;tin:string;footerNote:string;currency?:string};
export function receiptState({payment,invoice}:Pick<ReceiptDocument,'payment'|'invoice'>){
 const totals=invoiceTotals(invoice),refunded=refundedTotal(payment),net=paymentNet(payment),gone=payment.reversed,fullyRefunded=!gone&&refunded>0&&net<=0;
 return {totals,refunded,net,gone,fullyRefunded,stamp:gone?'reversed' as const:fullyRefunded?'refunded' as const:totals.due>0?'part' as const:'paid' as const};
}
export const receiptDocumentUrl=(token:string)=>new URL('/r/'+encodeURIComponent(token),SITE_URL).toString();
export const receiptPdfName=(receiptNo:string)=>'receipt-'+receiptNo.replace(/[^a-zA-Z0-9_-]/g,'-')+'.pdf';
