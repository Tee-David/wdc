import {after,NextRequest,NextResponse} from 'next/server';
import {settleFlutterwave,dispatchFlutterwaveReceipts} from '@/lib/flutterwave';
import {SITE_URL} from '@/lib/site';
export const maxDuration=60;
export async function GET(request:NextRequest){
 try{const result=await settleFlutterwave(request.nextUrl.searchParams.get('transaction_id')||'',request.nextUrl.searchParams.get('tx_ref')||'');
 if(result.test)return new NextResponse('Test payment verified. No real payment was recorded and the invoice remains unpaid.',{headers:{'Cache-Control':'private, no-store'}});
 after(async()=>{try{await dispatchFlutterwaveReceipts();}catch{console.error('[flutterwave] Receipt delivery remains pending.');}});
 return NextResponse.redirect(new URL('/r/'+encodeURIComponent(result.payment.token),SITE_URL),303);
 }catch{return new NextResponse('Payment could not be confirmed yet. Reopen your invoice to check its current balance, or contact the studio.',{status:503,headers:{'Cache-Control':'private, no-store'}});}
}
