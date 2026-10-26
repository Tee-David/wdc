"use client";

import { CalendarRange, Wallet } from "lucide-react";
import { DialogButton } from "./dialog";
import { Actions, Field, Fields, Form, Hidden, Radios, Select, Submit } from "./form";
import { endRetainerAction, saveRetainerAction } from "@/lib/admin/retainer-actions";
import { RETAINER_BILLING, type RetainerBilling } from "@/lib/admin/retainer-rules";
import type { Retainer } from "@/lib/admin/types";

type Plan = Pick<Retainer, "id" | "title" | "start" | "months" | "monthly" | "includes" | "billing" | "projectId"> & { draftedCount: number };

/**
 * SET UP OR CHANGE A CLIENT'S MONTHLY PLAN (the kit's "Change billing"
 * sheet, with the plan's own fields when there is no plan yet). Billing is per
 * client; a draft appears on Today when each part falls due and nothing is
 * emailed until Admin presses Send.
 */
export function RetainerSheet({ clientId, company, plan, projects, notes, label }: {
  clientId: string; company: string; plan: Plan | null; projects: { value: string; label: string }[];
  /** What each billing would ask for from here, worked out on the server from the parts left. */
  notes: Record<RetainerBilling, string> | null; label: string;
}) {
  return (
    <DialogButton label={label} title={plan ? `How ${company} pays for the ${plan.title.toLowerCase()}` : `Set up a monthly plan for ${company}`} icon={plan ? Wallet : CalendarRange} tone={plan ? "plain" : "primary"} wide>
      {(close) => (
        <Form action={saveRetainerAction} onDone={close}>
          <p className="ad__dim" style={{ margin: "0 0 1rem" }}>
            Billing is set per client. A draft invoice appears on Today when each part falls due; nothing is emailed until you press Send.
          </p>
          <Fields>
            <Hidden name="clientId" value={clientId} />
            <Field name="title" label="Plan name" required half defaultValue={plan?.title ?? "Social media plan"} />
            <Select name="projectId" label="Project" half defaultValue={plan?.projectId ?? ""} placeholder="Not tied to a project"
                    options={[{ value: "", label: "Not tied to a project" }, ...projects]} />
            <Field name="start" label="Starts" type="date" required half defaultValue={plan?.start ?? ""}
                   hint={plan?.draftedCount ? "Fixed once the first part is drafted." : undefined} />
            <Field name="months" label="Months" type="number" min="1" inputMode="numeric" required half defaultValue={plan?.months ?? 3} />
            <Field name="monthly" label="A month, before VAT (₦)" inputMode="decimal" required half defaultValue={plan ? String(plan.monthly / 100) : ""} placeholder="300,000" />
            <Radios name="billing" label="How they pay" defaultValue={plan?.billing ?? "Monthly"}
                    options={RETAINER_BILLING.map((b) => ({ value: b, label: b, note: notes?.[b] }))} />
            {[0, 1, 2, 3].map((i) => (
              <span key={i} style={{ display: "contents" }}>
                <Field name={`incT${i}`} label={`Includes ${i + 1}`} half defaultValue={plan?.includes[i]?.t ?? ""} placeholder={["12 posts", "4 reels", "1 report", ""][i]} />
                <Field name={`incS${i}`} label="How often" half defaultValue={plan?.includes[i]?.s ?? ""} placeholder={["a month", "a month", "on the 1st", ""][i]} />
              </span>
            ))}
          </Fields>
          {plan?.draftedCount ? <p className="ad__dim" style={{ margin: "1rem 0 0" }}>{plan.draftedCount} part{plan.draftedCount === 1 ? " is" : "s are"} already drafted. A change only affects invoices not yet drafted.</p> : null}
          <Actions><Submit>{plan ? "Update the plan" : "Set up the plan"}</Submit></Actions>
        </Form>
      )}
    </DialogButton>
  );
}

/** End the plan. Parts not yet drafted never are; drafts already made stay. */
export function EndRetainer({ id, title }: { id: string; title: string }) {
  return (
    <Form action={endRetainerAction} confirm={`End the ${title.toLowerCase()}? Parts not yet drafted will not be. Drafts already made stay for you to send or void.`}>
      <Hidden name="id" value={id} />
      <Submit tone="plain">End the plan</Submit>
    </Form>
  );
}
