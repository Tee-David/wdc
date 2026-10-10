import 'server-only';
import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {db} from '@/lib/db/pool';
import {transaction} from '@/lib/db/transaction';
import {adoptPersistedRecord,syncStore} from '@/lib/admin/persist';
import {getInvoice,getPaymentsFor} from '@/lib/admin/store';
import {invoiceTotals,paymentNet,type Invoice,type Payment,type ProviderEvent} from '@/lib/admin/types';
import {currencyOf} from '@/lib/money/currency';
import {SITE_URL} from '@/lib/site';

type Mode='test'|'live';
type Attempt={reference:string;invoice_id:string;amount:string;currency:string;mode:Mode;payment_id:string|null};
export function flutterwaveConfig(mode:Mode=process.env.FLUTTERWAVE_MODE==='test'?'test':'live'){
 const prefix=`FLUTTERWAVE_${mode.toUpperCase()}_`,secret=process.env[prefix+'SECRET_KEY']?.trim(),publicKey=process.env[prefix+'PUBLIC_KEY']?.trim();
 if(!secret||!publicKey||!secret.startsWith(mode==='test'?'FLWSECK_TEST-':'FLWSECK-')||!publicKey.startsWith(mode==='test'?'FLWPUBK_TEST-':'FLWPUBK-')||(mode==='live'&&(secret.includes('_TEST-')||publicKey.includes('_TEST-'))))return null;
 return {mode,secret,publicKey};
}
async function call(endpoint:string,mode:Mode,body?:object){
 const config=flutterwaveConfig(mode);if(!config)throw Error('Flutterwave is not configured for this checkout.');
 const response=await fetch('https://api.flutterwave.com/v3'+endpoint,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+config.secret,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000),cache:'no-store'});
 const result=await response.json().catch(()=>null);
 if(!response.ok||result?.status!=='success'||!result.data)throw Error('Flutterwave could not complete this request. Please retry.');
 return result.data;
}
export async function initializeFlutterwave(invoice:Invoice,email:string){
 const config=flutterwaveConfig();if(!config)throw Error('Flutterwave is not configured.');
 const amount=invoiceTotals(invoice).due,currency=currencyOf(invoice);if(!Number.isSafeInteger(amount)||amount<=0||!['NGN','USD'].includes(currency))throw Error('This invoice cannot be paid online.');
 const reference='FLW-'+randomUUID();
 await db.query('INSERT INTO flutterwave_checkout_attempts(reference,invoice_id,amount,currency,mode) VALUES($1,$2,$3,$4,$5)',[reference,invoice.id,amount,currency,config.mode]);
 const data=await call('/payments',config.mode,{tx_ref:reference,amount:amount/100,currency,redirect_url:new URL('/pay/flutterwave/return',SITE_URL).toString(),customer:{email},customizations:{title:'We Dig Creativity',description:'Invoice '+invoice.number},meta:{invoice_id:invoice.id}});
 const url=new URL(data.link);if(url.protocol!=='https:'||!(url.hostname==='checkout.flutterwave.com'||url.hostname.endsWith('.flutterwave.com')||(config.mode==='test'&&url.hostname==='checkout-v2.dev-flutterwave.com')))throw Error('Flutterwave returned an invalid checkout address.');
 return {url:url.toString(),mode:config.mode};
}
function equals(left:string,right:string){const a=Buffer.from(left),b=Buffer.from(right);return a.length===b.length&&timingSafeEqual(a,b);}
export function flutterwaveWebhookMode(raw:string,headers:Headers):Mode|null{
 const matches:Mode[]=[];for(const mode of ['test','live'] as const){const secret=process.env[`FLUTTERWAVE_${mode.toUpperCase()}_WEBHOOK_SECRET`]?.trim();if(!secret)continue;
 const signed=headers.get('flutterwave-signature'),legacy=headers.get('verif-hash');
 if(signed?equals(createHmac('sha256',secret).update(raw).digest('base64'),signed):Boolean(legacy&&equals(secret,legacy)))matches.push(mode);
 }return matches.length===1?matches[0]:null;
}
export function verifiedFlutterwaveAmount(data:{status?:unknown;tx_ref?:unknown;currency?:unknown;amount?:unknown},expected:{reference:string;currency:string;amount:string|number}){
 const amount=typeof data.amount==='number'?data.amount:typeof data.amount==='string'&&/^\d+(\.\d{1,2})?$/.test(data.amount)?Number(data.amount):NaN;
 const minor=Math.round(amount*100);return data.status==='successful'&&data.tx_ref===expected.reference&&data.currency===expected.currency&&Number.isSafeInteger(minor)&&minor===Number(expected.amount)&&Math.abs(amount*100-minor)<0.00001;
}
/** Provider verification precedes a single atomic invoice/payment/audit write. No callback status is trusted. */
export async function settleFlutterwave(id:string,reference:string,signedMode?:Mode){
 if(!/^\d{1,24}$/.test(id)||!/^FLW-[a-f0-9-]{36}$/.test(reference))throw Error('Invalid payment reference.');
 const attempts=await db.query<Attempt>('SELECT reference,invoice_id,amount,currency,mode,payment_id FROM flutterwave_checkout_attempts WHERE reference=$1',[reference]);const attempt=attempts.rows[0];
 if(!attempt||signedMode&&attempt.mode!==signedMode)throw Error('This checkout could not be identified.');
 const data=await call('/transactions/'+id+'/verify',attempt.mode);
 if(String(data.id)!==id||!verifiedFlutterwaveAmount(data,attempt))throw Error('The payment details do not match this invoice.');
 if(attempt.mode!=='live')return {test:true as const,invoiceId:attempt.invoice_id};
 const result=await transaction(async tx=>{
  const locked=await tx.query<Attempt>('SELECT reference,invoice_id,amount,currency,mode,payment_id FROM flutterwave_checkout_attempts WHERE reference=$1 FOR UPDATE',[reference]);const current=locked.rows[0];if(!current)throw Error('Checkout no longer exists.');
  if(current.payment_id){const prior=await tx.query<{data:Payment}>("SELECT data FROM admin_records WHERE collection='PAYMENTS' AND id=$1",[current.payment_id]);if(!prior.rows[0]?.data)throw Error('The payment is still being recorded.');return {payment:prior.rows[0].data,invoice:null,event:null};}
  const records=await tx.query<{data:Invoice}>("SELECT data FROM admin_records WHERE collection='INVOICES' AND id=$1 FOR UPDATE",[current.invoice_id]);const invoice=records.rows[0]?.data;
  if(!invoice||invoice.status==='Draft'||invoice.voided||currencyOf(invoice)!==current.currency)throw Error('The invoice is no longer available for this payment.');
  const count=await tx.query<{n:string}>("SELECT nextval('flutterwave_receipt_seq')::STRING AS n");const payment:Payment={id:'y'+randomUUID(),invoiceId:invoice.id,currency:current.currency,at:new Date().toISOString(),amount:Number(current.amount),method:'Flutterwave',reference,receiptNo:`RCT-${new Date().getFullYear()}-F${count.rows[0].n.padStart(6,'0')}`,token:randomUUID().replaceAll('-',''),by:'Flutterwave',mode:'live'};
  const existing=await tx.query<{data:Payment}>("SELECT data FROM admin_records WHERE collection='PAYMENTS' AND data->>'invoiceId'=$1 AND data IS NOT NULL",[invoice.id]);invoice.paid=existing.rows.reduce((sum,row)=>sum+paymentNet(row.data),payment.amount);
  const event:ProviderEvent={id:'pe'+randomUUID(),at:payment.at,provider:'Flutterwave',event:'charge.completed',reference,amount:payment.amount,outcome:'Applied',mode:'live',invoiceId:invoice.id,paymentId:payment.id};
  for(const [collection,record]of [['PAYMENTS',payment],['INVOICES',invoice],['PROVIDER_EVENTS',event]] as const)await tx.query("INSERT INTO admin_records(collection,id,data,seq,ord,updated_at) VALUES($1,$2,$3::JSONB,nextval('admin_records_seq'),currval('admin_records_seq'),now()) ON CONFLICT(collection,id) DO UPDATE SET data=excluded.data,seq=excluded.seq,updated_at=excluded.updated_at",[collection,record.id,JSON.stringify(record)]);
  await tx.query('UPDATE flutterwave_checkout_attempts SET transaction_id=$2,payment_id=$3 WHERE reference=$1',[reference,id,payment.id]);
  await tx.query("INSERT INTO audit_log(at,actor,kind,subject_id,subject,action,to_value,note) VALUES(now(),'Flutterwave','payment',$1,$2,'recorded',$3,$4)",[payment.id,payment.receiptNo,String(payment.amount),reference+' against '+invoice.number]);
  return {payment,invoice,event};
 });
 adoptPersistedRecord('PAYMENTS',result.payment.id,result.payment);if(result.invoice)adoptPersistedRecord('INVOICES',result.invoice.id,result.invoice);if(result.event)adoptPersistedRecord('PROVIDER_EVENTS',result.event.id,result.event);
 return {test:false as const,payment:result.payment};
}
/** The checkout's pending flag is durable before response; retries use existing email dedupe keys. */
export async function dispatchFlutterwaveReceipts(limit=1){
 await syncStore();const rows=await db.query<{reference:string;invoice_id:string;payment_id:string}>('SELECT reference,invoice_id,payment_id FROM flutterwave_checkout_attempts WHERE payment_id IS NOT NULL AND notifications_staged=false ORDER BY created_at LIMIT $1',[limit]);
 const {sendOnlinePaymentEmails}=await import('@/lib/money-mail');
 for(const row of rows.rows){const invoice=getInvoice(row.invoice_id),payment=getPaymentsFor(row.invoice_id).find(p=>p.id===row.payment_id);if(!invoice||!payment)continue;await sendOnlinePaymentEmails({invoice,payment});await db.query('UPDATE flutterwave_checkout_attempts SET notifications_staged=true WHERE reference=$1',[row.reference]);}
}

/** One pending live checkout per existing heartbeat: at most 288 provider checks/day, no new worker. */
export async function reconcileFlutterwaveCheckout(){
 const pending=await db.query<Attempt>("SELECT reference,invoice_id,amount,currency,mode,payment_id FROM flutterwave_checkout_attempts WHERE payment_id IS NULL AND mode='live' AND created_at>now()-INTERVAL '7 days' AND created_at<now()-INTERVAL '2 minutes' AND (last_checked_at IS NULL OR last_checked_at<now()-INTERVAL '5 minutes') ORDER BY last_checked_at ASC NULLS FIRST,created_at LIMIT 1");
 const attempt=pending.rows[0];if(!attempt)return;
 await db.query('UPDATE flutterwave_checkout_attempts SET last_checked_at=now() WHERE reference=$1',[attempt.reference]);
 try{const data=await call('/transactions/verify_by_reference?tx_ref='+encodeURIComponent(attempt.reference),attempt.mode);if(verifiedFlutterwaveAmount(data,attempt))await settleFlutterwave(String(data.id),attempt.reference,attempt.mode);}catch{/* No successful verified payment: leave the invoice unchanged for the next check. */}
}
