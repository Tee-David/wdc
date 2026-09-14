import { NextRequest, NextResponse } from "next/server";
import { SITE_URL } from "@/lib/site";
import { callerKey, rateLimit } from "@/lib/rate-limit";
import { getClient, getInvoiceByToken, recordProviderEvent } from "@/lib/admin/store";
import { invoiceStatus, invoiceTotals } from "@/lib/admin/types";
import { initializeTransaction, paymentReference } from "@/lib/paystack";

/**
 * "Pay this invoice" -- the only endpoint that starts a checkout.
 *
 * A PLAIN FORM POST, NOT A FETCH. The button on the public invoice is a real
 * submit button in a real form, so it works with JavaScript off, it is a POST
 * rather than a GET (a link that spends money must not be something a link
 * prefetcher or a mail scanner can follow), and the answer is a 303 to
 * Paystack's own hosted page.
 *
 * THE TOKEN IS THE WHOLE AUTHORISATION, exactly as on /i/<token>. Nothing in
 * the request body is read: not the amount, not the invoice, not the email.
 * Everything comes off the record the token resolves to, because a form field
 * is a number the payer can edit.
 *
 * NOTHING HERE MARKS ANYTHING PAID. This creates an intention. The payment is
 * written by the webhook or by the verified return, and both of those ask
 * Paystack rather than believing us.
 */

/* Paystack's initialize is a network call we do not own the latency of, and
   the platform must not cut it off before our own 15-second ceiling does. */
export const maxDuration = 30;

/* A checkout costs a Paystack API call and creates a record on their side.
   Ten in ten minutes is far more than any honest payer needs and far less
   than a script wants. Per caller, per invoice. */
const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 10;

function back(token: string, error?: string) {
  const url = new URL(`/i/${token}`, SITE_URL);
  if (error) url.searchParams.set("pay", error);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;

  const limit = rateLimit(callerKey(request, `pay:${token}`), LIMIT, WINDOW_MS);
  if (!limit.ok) return back(token, "busy");

  const inv = getInvoiceByToken(token);
  /* The same plain 404 a wrong token gets on the document itself. A different
     answer here would confirm that a token is nearly right. */
  if (!inv || inv.status === "Draft") return new NextResponse("Not found", { status: 404 });

  const totals = invoiceTotals(inv);
  if (totals.due <= 0) return back(token, "settled");

  const client = getClient(inv.clientId);
  const email = client?.email?.trim();
  /* PAYSTACK REQUIRES AN EMAIL AND WE WILL NOT INVENT ONE. A placeholder
     address means the receipt Paystack sends goes nowhere and the transaction
     cannot be found by the payer later. Better to say so and let them pay the
     way the invoice already offers. */
  if (!email) return back(token, "no-email");

  const reference = paymentReference(inv.number);
  const started = await initializeTransaction({
    email,
    amount: totals.due,
    reference,
    callbackUrl: new URL("/pay/done", SITE_URL).toString(),
    metadata: { invoiceId: inv.id, invoiceNumber: inv.number, invoiceToken: inv.token },
  });

  if (!started.ok) {
    /* WRITTEN DOWN EVEN THOUGH NOTHING WAS CHARGED. A checkout that would not
       start is the invisible failure: the payer sees an error, closes the tab
       and waits for somebody to chase them. This is the row that lets the
       studio notice. */
    recordProviderEvent({
      event: "checkout.initialize", reference, amount: totals.due,
      outcome: "Failed", invoiceId: inv.id,
      note: started.error,
    });
    return back(token, "unavailable");
  }

  recordProviderEvent({
    event: "checkout.started", reference, amount: totals.due,
    outcome: "Ignored", invoiceId: inv.id,
    note: `Checkout opened for ${invoiceStatus(inv).toLowerCase()} invoice ${inv.number}.`,
  });

  return NextResponse.redirect(started.data.authorization_url, 303);
}
