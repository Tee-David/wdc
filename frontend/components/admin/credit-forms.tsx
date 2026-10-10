"use client";
import {currencyOf,money} from "@/lib/money/currency";

import { Wallet } from "lucide-react";
import type { Credit } from "@/lib/admin/types";
import { applyCredit } from "@/lib/admin/actions";
import { Actions, Field, Fields, Form, Hidden, Select, Submit } from "./form";
import { DialogButton } from "./dialog";

/**
 * Spend a credit on an invoice. This is the balance carrying forward.
 *
 * WHAT IT SAYS BEFORE IT DOES ANYTHING. Applying credit creates a real payment
 * with a real receipt number on a document the client can open, so the dialog
 * says that rather than leaving somebody to find out from the audit log.
 *
 * ONLY OPEN INVOICES ARE OFFERED, and only this client's. A credit applied to
 * a settled invoice would overpay it and create the very thing the credit was
 * raised to clear.
 */
export function ApplyCredit({
  credit, invoices,
}: {
  credit: Credit;
  invoices: { id: string; number: string; due: number }[];
}) {
  return (
    <DialogButton label="Use it" title={`Put ${money(credit.amount,currencyOf(credit))} against an invoice`} icon={Wallet}>
      {(close) => (
        <Form action={applyCredit} onDone={() => close()}>
          <Fields>
            <Hidden name="id" value={credit.id} />
            <Select
              name="invoiceId" label="Which invoice" required
              placeholder="Pick one"
              options={invoices.map((i) => ({
                value: i.id, label: `${i.number}, ${money(i.due,currencyOf(credit))} owing`,
              }))}
            />
            <Field name="by" label="Applied by" placeholder="Babatope" />
          </Fields>
          <p className="ad__dim" style={{ fontSize: ".88rem", lineHeight: 1.6 }}>
            This becomes an ordinary payment on that invoice, with its own
            receipt number and its own page, marked as having come from credit.
            If the credit is larger than the invoice, only what fits is used and
            the rest stays on their balance as its own row.
          </p>
          <Actions>
            <Submit icon={Wallet}>Apply it</Submit>
          </Actions>
        </Form>
      )}
    </DialogButton>
  );
}
