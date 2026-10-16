"use client";

import { Ban, Bell, UserPlus } from "lucide-react";
import { addColleague, changeColleague, removeColleague } from "@/lib/portal/people-actions";
import type { Colleague } from "@/lib/portal/people";
import { Actions, Checks, Field, Fields, Form, Hidden, Submit } from "@/components/admin/form";
import { DialogButton } from "@/components/admin/dialog";
import { RowMenu } from "@/components/admin/row-menu";

const GETS = [
  { value: "review", label: "Approvals: they can approve work or ask for changes" },
  { value: "billing", label: "Invoices and receipts: they can see and pay them" },
];
const gets = (c: { review: boolean; billing: boolean }) => [c.review && "review", c.billing && "billing"].filter(Boolean) as string[];

/** "Add a person": their own sign in, on every live project, with the rights ticked. */
export function AddColleague({ projects }: { projects: number }) {
  return (
    <DialogButton label="Add a person" title="Add someone from your business" icon={UserPlus}>
      {(close) => (
        <Form action={addColleague} onDone={close} resetOnDone>
          <p className="ad__dim" style={{ margin: "0 0 .8rem" }}>
            They get their own sign in and see your {projects === 1 ? "project" : `${projects} live projects`}, its updates and messages. Tick what else they can do. You can change it any time.
          </p>
          <Fields>
            <Field name="name" label="Full name" required placeholder="Kemi Adeyemi" />
            <Field name="email" label="Email" type="email" inputMode="email" required placeholder="kemi@yourbusiness.com" hint="The invite goes here. Temporary inboxes cannot receive one." />
          </Fields>
          <Checks name="gets" label="They can also" long options={GETS} defaultValue={["review"]} />
          <Actions><Submit icon={UserPlus}>Send the invite</Submit></Actions>
        </Form>
      )}
    </DialogButton>
  );
}

export function ColleagueMenu({ c }: { c: Colleague }) {
  const first = c.name.split(" ")[0];
  return (
    <RowMenu label={c.name} items={[
      { kind: "dialog", label: "Change what they can do", icon: Bell, title: `What ${first} can do`,
        render: (close) => (
          <Form action={changeColleague} onDone={close}>
            <Hidden name="id" value={c.id} />
            <Hidden name="kind" value={c.kind} />
            <p className="ad__dim" style={{ margin: "0 0 .8rem" }}>{first} always sees your projects, their updates and messages.</p>
            <Checks name="gets" label="They can also" long options={GETS} defaultValue={gets(c)} />
            <Actions><Submit icon={Bell}>Save what {first} can do</Submit></Actions>
          </Form>
        ) },
      { kind: "dialog", label: c.kind === "invite" ? "Cancel the invite" : "Remove access", icon: Ban, tone: "danger", title: c.kind === "invite" ? `Cancel ${first}'s invite?` : `Remove ${c.name}?`,
        render: (close) => (
          <Form action={removeColleague} onDone={close}>
            <Hidden name="id" value={c.id} />
            <Hidden name="kind" value={c.kind} />
            <div className="ad__sure"><p>{c.kind === "invite" ? "The link in their email stops working. You can invite them again any time." : "They can no longer see your projects or get emails from us about them. You can add them again any time."}</p></div>
            <Actions>
              <button type="button" className="ad__btn" onClick={close}>Keep {first}</button>
              <Submit tone="danger" icon={Ban}>{c.kind === "invite" ? "Cancel the invite" : "Remove access"}</Submit>
            </Actions>
          </Form>
        ) },
    ]} />
  );
}
