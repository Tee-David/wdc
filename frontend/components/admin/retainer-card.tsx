"use client";

import { CalendarRange, FileText, Pencil, Plus, Receipt, Send, Server, Wallet } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ask } from "./confirm";
import { toast } from "./toast";
import { DialogButton } from "./dialog";
import { Actions, Field, Fields, Form, Hidden, Radios, Select, Submit } from "./form";
import { addCostAction, billCostsNow, endRetainerAction, removeCostAction, removeSystemAction, saveReportAction, saveRetainerAction, saveSystemAction, shareReport } from "@/lib/admin/retainer-actions";
import { Area } from "./form";
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

/* ---------------------------------------------------------------- the plan page */

type Sys = NonNullable<Retainer["systems"]>[number];

/** Add something the plan looks after, or edit one already on it. */
export function SystemSheet({ planId, sys }: { planId: string; sys?: Sys }) {
  return (
    <DialogButton label={sys ? `Edit ${sys.name}` : "Add a system"} title={sys ? `Edit ${sys.name}` : "Add a system the plan looks after"} icon={sys ? Pencil : Server} tone="plain" iconOnly={Boolean(sys)}>
      {(close) => (
        <Form action={saveSystemAction} onDone={close}>
          <Fields>
            <Hidden name="id" value={planId} />
            {sys ? <Hidden name="sysId" value={sys.id} /> : null}
            <Field name="name" label="What it is" required half defaultValue={sys?.name ?? ""} placeholder="VPS, website, scraper app" />
            <Field name="access" label="Access held by" half defaultValue={sys?.access ?? ""} placeholder="The studio, or the client" />
            <Field name="renews" label="Renews" type="date" half defaultValue={sys?.renews ?? ""} hint="A domain, hosting or licence date. Leave empty if it does not renew." />
            <Area name="notes" label="Notes" defaultValue={sys?.notes ?? ""} rows={3} placeholder="Where it lives and anything the next person should know. Never a password." />
          </Fields>
          <Actions><Submit>{sys ? "Update the system" : "Add the system"}</Submit></Actions>
        </Form>
      )}
    </DialogButton>
  );
}

/** A cost paid on the client's behalf, added to the next draft. */
export function CostSheet({ planId, today }: { planId: string; today: string }) {
  return (
    <DialogButton label="Add a cost" title="Add a cost to pass on" icon={Receipt} tone="plain">
      {(close) => (
        <Form action={addCostAction} onDone={close}>
          <p className="ad__dim" style={{ margin: "0 0 1rem" }}>It goes on the next invoice the plan drafts, or bill it on its own from this page.</p>
          <Fields>
            <Hidden name="id" value={planId} />
            <Field name="what" label="What it was" required placeholder="VPS for October" />
            <Field name="amount" label="Amount (₦)" required half inputMode="decimal" placeholder="25,000" />
            <Field name="date" label="Paid on" type="date" required half defaultValue={today} />
          </Fields>
          <Actions><Submit>Add the cost</Submit></Actions>
        </Form>
      )}
    </DialogButton>
  );
}

/** Write or correct one month's report. */
export function ReportSheet({ planId, month, label, body, startOpen = false, primary = false }: { planId: string; month: string; label: string; body?: string; startOpen?: boolean; primary?: boolean }) {
  return (
    <DialogButton label={label} title={`Report for ${label.replace(/^(Write|Edit) the /, "").replace(/ report$/, "")}`} icon={body ? Pencil : FileText} tone={primary ? "primary" : "plain"} startOpen={startOpen}>
      {(close) => (
        <Form action={saveReportAction} onDone={close}>
          <p className="ad__dim" style={{ margin: "0 0 1rem" }}>What was done, what it achieved and what comes next. It stays a draft until you press Share.</p>
          <Fields>
            <Hidden name="id" value={planId} />
            <Hidden name="month" value={month} />
            <Area name="body" label="The report" rows={8} defaultValue={body ?? ""} placeholder={"Posted 12 of 12 planned posts and 4 reels.\nReach rose to 18,400.\nNext month: the body oil launch."} />
          </Fields>
          <Actions><Submit>Save the report</Submit></Actions>
        </Form>
      )}
    </DialogButton>
  );
}

/** A one-press action that asks first, then refreshes the page with the answer as a toast. */
export function PlanRun({ label, question, run, tone = "plain", icon: Icon = Send }: { label: string; question: string; run: () => Promise<{ ok: boolean; message?: string }>; tone?: "plain" | "primary"; icon?: typeof Send }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const [, setDone] = useState(0);
  return (
    <button type="button" className={`ad__btn${tone === "primary" ? " ad__btn--primary" : ""}`} disabled={pending}
      onClick={async () => {
        if (!(await ask(question))) return;
        start(async () => { const r = await run(); if (r.message) toast(r.message, r.ok ? "good" : "bad"); setDone((n) => n + 1); router.refresh(); });
      }}>
      <Icon aria-hidden="true" />{label}
    </button>
  );
}

export function SharePlanReport({ planId, reportId, month, company }: { planId: string; reportId: string; month: string; company: string }) {
  return <PlanRun label="Share" question={`Share the ${month} report with ${company}? It appears on their Billing page and they get a notice.`} run={() => shareReport(planId, reportId)} />;
}
export function BillPlanCosts({ planId, total }: { planId: string; total: string }) {
  return <PlanRun label="Bill them now" icon={Plus} question={`Draft an invoice for the costs not yet billed (${total})? It waits on Today for you to send.`} run={() => billCostsNow(planId)} />;
}

export function RemovePlanRow({ planId, rowId, kind, name }: { planId: string; rowId: string; kind: "system" | "cost"; name: string }) {
  return (
    <Form action={kind === "system" ? removeSystemAction : removeCostAction} confirm={`Take ${name} off the plan?`}>
      <Hidden name="id" value={planId} />
      <Hidden name={kind === "system" ? "sysId" : "costId"} value={rowId} />
      <Submit tone="plain">Remove</Submit>
    </Form>
  );
}
