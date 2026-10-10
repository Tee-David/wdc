import {after,NextRequest,NextResponse} from 'next/server';
import {settleFlutterwave,flutterwaveWebhookMode,dispatchFlutterwaveReceipts} from '@/lib/flutterwave';
export const maxDuration=60;
export async function POST(request:NextRequest){
 if(Number(request.headers.get('content-length')||0)>64000)return new NextResponse('Too large',{status:413});
 const raw=await request.text();if(raw.length>64000)return new NextResponse('Too large',{status:413});const mode=flutterwaveWebhookMode(raw,request.headers);if(!mode)return new NextResponse('Not allowed',{status:401});
 let body;try{body=JSON.parse(raw);}catch{return new NextResponse('Invalid payload',{status:400});}
 if(body.event!=='charge.completed')return NextResponse.json({received:true});
 try{await settleFlutterwave(String(body.data?.id||''),String(body.data?.tx_ref||''),mode);after(async()=>{try{await dispatchFlutterwaveReceipts();}catch{console.error('[flutterwave] Receipt delivery remains pending.');}});return NextResponse.json({received:true});}
 catch{return new NextResponse('Payment verification pending',{status:503});}
}
