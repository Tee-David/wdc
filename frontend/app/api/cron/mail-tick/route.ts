import { timingSafeEqual } from "node:crypto";
import { after,NextResponse, type NextRequest } from "next/server";
import { runBatch } from "@/lib/campaigns";
import { runAutomations } from "@/lib/automations";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The campaign sender's heartbeat, called every few minutes by a free GitHub
 * Actions schedule (.github/workflows/mail-tick.yml); Vercel's own cron only
 * runs daily. FAILS CLOSED like the daily one: no secret set, or a wrong one,
 * and nothing runs.
 */
async function handle(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set." }, { status: 503 });
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const wanted = Buffer.from(`Bearer ${secret}`);
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  const campaigns = await runBatch();
  /* Automations ride the same heartbeat; a failure there must not hide the campaign result. */
  const automations = await runAutomations().catch(() => null);
  // Intent already exists in the database. One workspace SMTP attempt runs after this response.
  after(async()=>{
    try { const {dispatchFlutterwaveReceipts,reconcileFlutterwaveCheckout}=await import('@/lib/flutterwave');await reconcileFlutterwaveCheckout();await dispatchFlutterwaveReceipts(); } catch { console.error('[flutterwave] Pending receipt delivery will retry.'); }
    try { const {dispatchWorkspaceEvents}=await import('@/lib/workspace/events');await dispatchWorkspaceEvents({limit:1}); }
    catch { console.error('[workspace-mail] Dispatch interrupted. Pending or unconfirmed attempts remain in the durable notification log.'); }
    /* Messages Admin scheduled for now or earlier (migration 0062). */
    try { const {sendDueMessages}=await import('@/lib/messages/marks');await sendDueMessages(); }
    catch { console.error('[messages] Scheduled sends interrupted. Unsent rows stay for the next tick.'); }
    /* Mail the host refused for now (a spam verdict, a timeout), tried again on a spaced schedule. */
    try { const {retryFailedMail}=await import('@/lib/mail-retry');await retryFailedMail(); }
    catch { console.error('[mail-retry] Interrupted. Failed messages stay in the log for the next tick.'); }
  });
  return NextResponse.json({ ...campaigns, automations,workspace:{scheduled:true,acceptance:'Check the message log after the provider answers.'} });
}
export const GET = handle;
export const POST = handle;
