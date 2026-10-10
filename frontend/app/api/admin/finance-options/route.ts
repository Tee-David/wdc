import {NextResponse} from "next/server";
import {requireWorkspaceUser} from "@/lib/workspace/access";
import {paymentOptions} from "@/lib/money/payment-options";
import {syncStore} from "@/lib/admin/persist";
import {getInvoice} from "@/lib/admin/store";
import {currencyOf} from "@/lib/money/currency";
export async function GET(request:Request){try{const user=await requireWorkspaceUser();if(user.role!=="owner")return NextResponse.json({error:"Owner only."},{status:403});const id=new URL(request.url).searchParams.get("invoiceId");if(id){await syncStore();const invoice=getInvoice(id);if(!invoice)return NextResponse.json({error:"Invoice missing."},{status:404});return NextResponse.json({currency:currencyOf(invoice)},{headers:{"Cache-Control":"private, no-store"}});}return NextResponse.json(await paymentOptions(),{headers:{"Cache-Control":"private, no-store"}});}catch{return NextResponse.json({error:"Sign in again."},{status:403});}}
