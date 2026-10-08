"use client";

import { Workflow } from "lucide-react";
import { newAutomationAction } from "@/lib/admin/automation-actions";
import { Actions, Field, Fields, Form, Select, Submit } from "../form";
import { DialogButton } from "../dialog";

export function NewAutomation() {
  return (
    <DialogButton label="New automation" title="New automation" icon={Workflow}>
      {() => (
        <Form action={newAutomationAction}>
          <Fields>
            <Field name="name" label="Name" required placeholder="Welcome series" />
            <Select name="trigger" label="Starts when" defaultValue="new_contact" options={[{ value: "new_contact", label: "Someone becomes a contact" }, { value: "tag_added", label: "A tag is added" }]} />
            <Field name="tag" label="Tag" placeholder="newsletter" hint="Only for “A tag is added”." />
            <Select name="kind" label="It is" defaultValue="marketing" options={[{ value: "marketing", label: "Marketing: only people who asked to hear from us" }, { value: "service", label: "Service: follow-up to people we work with" }]} />
          </Fields>
          <Actions><Submit icon={Workflow}>Start</Submit></Actions>
        </Form>
      )}
    </DialogButton>
  );
}
