import {NextRequest,NextResponse} from 'next/server';
import {getClient,getInvoiceByToken} from '@/lib/admin/store';
import {syncStore} from '@/lib/admin/persist';
import {initializeFlutterwave} from '@/lib/flutterwave';
import {callerKey,rateLimit} from '@/lib/rate-limit';
import {SITE_URL} from '@/lib/site';
export const maxDuration=30;
export async function POST(request:NextRequest,{params}:{params:Promise<{token:string}>}){
 const origin=request.headers.get('origin');if(!origin||origin!==new URL(SITE_URL).origin)return new NextResponse('Not allowed',{status:403});
 const {token}=await params;if(!rateLimit(callerKey(request,'flutterwave-pay:'+token),10,600000).ok)return new NextResponse('Try again shortly.',{status:429});
 try{await syncStore();const invoice=getInvoiceByToken(token);if(!invoice||invoice.status==='Draft')return new NextResponse('Not found',{status:404});const email=getClient(invoice.clientId)?.email?.trim();if(invoice.voided||!email)return new NextResponse('This invoice cannot be paid online.',{status:422});
 const checkout=await initializeFlutterwave(invoice,email);return NextResponse.redirect(checkout.url,303);
 }catch{const back=new URL('/i/'+encodeURIComponent(token),SITE_URL);back.searchParams.set('pay','unavailable');return NextResponse.redirect(back,303);}
}
