"use client";

import { useState } from "react";
import { Ban, Check, Plus, Send } from "lucide-react";
import type { Payout } from "@/lib/admin/types";
import { naira } from "@/lib/admin/types";
import { changePayout, createPayout } from "@/lib/money/payout-actions";
import { Actions, Area, Field, Fields, Form, Hidden, Submit } from "./form";
import { RemoteSelect } from "./remote-pick";
import { DialogButton } from "./dialog";
import { RowMenu, type RowMenuItem } from "./row-menu";

/**
 * PAYOUTS: what the studio owes freelancers for work a client approved. Added
 * here, approved by Admin (the exact amount and day, before anything moves),
 * then marked paid once the transfer has left, which records the expense.
 */
/** Today as a studio calendar day (UTC+1, no daylight saving). */
const lagosDay = () => new Date(new Date().getTime() + 3_600_000).toISOString().slice(0, 10);

export function AddPayout({ tone = "primary" }: { tone?: "primary" | "plain" }) {
  const [fresh, setFresh] = useState(0);
  return (
    <DialogButton label="Add a payout" title="Money owed to a freelancer" icon={Plus} tone={tone} wide>
      {(close) => (
        <Form key={fresh} action={createPayout} onDone={() => { close(); setFresh((n) => n + 1); }}>
          <Fields>
            <Field name="who" label="Who it is for" required half placeholder="Tolu Adebayo" />
            <Field name="email" label="Their email" half type="email" inputMode="email" placeholder="tolu@example.com" hint="Optional. Kept with the payout for when you send the payment advice." />
            <Field name="work" label="What the work was" required placeholder="Motion design, launch reel (20 seconds)" />
            <Field name="amount" label="Amount (NGN)" required half inputMode="decimal" />
            <Field name="due" label="Pay on" type="date" required half defaultValue={lagosDay()} />
            <RemoteSelect name="projectId" label="For which project" kind="projects" placeholder="Not for one project"
              hint="When it is paid, the cost lands against this project, so its margin is honest." />
            <Area name="note" label="Anything worth saying" rows={2} placeholder="Client approved the final cut on 8 Oct." />
          </Fields>
          <Actions><Submit icon={Plus}>Add the payout</Submit></Actions>
        </Form>
      )}
    </DialogButton>
  );
}

function Confirm({ ids, to, close, children, verb }: { ids: string[]; to: "Approved"; close: () => void; children: React.ReactNode; verb: string }) {
  return (
    <Form action={changePayout} onDone={() => close()}>
      <div className="ad__sure"><p>{children}</p></div>
      <Hidden name="ids" value={ids.join(",")} />
      <Hidden name="to" value={to} />
      <Actions>
        <button type="button" className="ad__btn" onClick={close}>Leave it</button>
        <Submit icon={Check}>{verb}</Submit>
      </Actions>
    </Form>
  );
}

function MarkPaid({ ids, close, children }: { ids: string[]; close: () => void; children: React.ReactNode }) {
  return (
    <Form action={changePayout} onDone={() => close()}>
      <p className="ad__dim" style={{ margin: "0 0 .8rem" }}>{children}</p>
      <Hidden name="ids" value={ids.join(",")} />
      <Hidden name="to" value="Paid" />
      <Fields>
        <Field name="paidOn" label="Paid on" type="date" required half defaultValue={lagosDay()} />
        <Field name="reference" label="Transfer reference" half placeholder="000123456789" />
      </Fields>
      <Actions><Submit icon={Send}>Mark paid and record the expense</Submit></Actions>
    </Form>
  );
}

/** The payouts tab's one action: approve everything that is ready, after seeing the total. */
export function ApprovePayouts({ ready }: { ready: { id: string; who: string; amount: number }[] }) {
  const total = ready.reduce((n, p) => n + p.amount, 0);
  return (
    <DialogButton label={`Approve ${ready.length === 1 ? "the payout" : `${ready.length} payouts`}`} title={`Approve ${naira(total)} in payouts?`} icon={Check}>
      {(close) => (
        <Confirm ids={ready.map((p) => p.id)} to="Approved" close={close} verb={`Approve ${naira(total)}`}>
          {ready.map((p) => `${p.who} ${naira(p.amount)}`).join(", ")}. Approving agrees the amounts. Mark each one paid once the transfer has left.
        </Confirm>
      )}
    </DialogButton>
  );
}

export function PayoutMenu({ payout }: { payout: Payout }) {
  const items: RowMenuItem[] = [];
  const what = `${payout.who}, ${naira(payout.amount)}`;
  if (payout.state === "Ready") {
    items.push({ kind: "dialog", label: "Approve", icon: Check, title: `Approve ${naira(payout.amount)} to ${payout.who}?`,
      render: (close) => <Confirm ids={[payout.id]} to="Approved" close={close} verb="Approve the payout">{payout.work}. Approving agrees the amount and the day. Nothing leaves the account until you mark it paid.</Confirm> });
  }
  if (payout.state === "Ready" || payout.state === "Approved") {
    items.push({ kind: "dialog", label: "Mark paid", icon: Send, title: `Did ${naira(payout.amount)} go to ${payout.who}?`,
      render: (close) => <MarkPaid ids={[payout.id]} close={close}>{payout.work}. Marking it paid records a Contractors expense{payout.projectId ? " against its project" : ""} for the same amount.</MarkPaid> });
    items.push({ kind: "dialog", label: "Cancel the payout", icon: Ban, tone: "danger", title: `Cancel the payout to ${payout.who}?`,
      render: (close) => (
        <Form action={changePayout} onDone={() => close()}>
          <Hidden name="ids" value={payout.id} />
          <Hidden name="to" value="Cancelled" />
          <Area name="note" label="Why" required placeholder="The work was cancelled before delivery." hint="It stays in the list as Cancelled with this note." />
          <Actions><Submit tone="danger" icon={Ban}>Cancel the payout</Submit></Actions>
        </Form>
      ) });
  }
  if (!items.length) return null;
  return <RowMenu items={items} label={what} />;
}
