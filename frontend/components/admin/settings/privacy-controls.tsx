"use client";

import { Eraser, Save } from "lucide-react";
import { eraseRequest, saveRetentionRules } from "@/lib/admin/privacy-actions";
import { Actions, Field, Fields, Form, Hidden, Select, Submit } from "@/components/admin/form";

type Rule = { key: string; label: string; what: string; action: string; options: (number | null)[] };

const period = (d: number | null) => (d === null ? "Keep" : d % 365 === 0 ? `${d / 365} year${d === 365 ? "" : "s"}` : `${d} days`);

export function RetentionForm({ rules, values }: { rules: Rule[]; values: Record<string, number | null> }) {
  return (
    <Form action={saveRetentionRules}>
      <Fields>
        {rules.map((r) => (
          <Select key={r.key} name={r.key} label={r.label} half defaultValue={values[r.key] === null ? "keep" : String(values[r.key])}
            hint={`${r.what} After that: ${r.action}`}
            options={r.options.map((o) => ({ value: o === null ? "keep" : String(o), label: period(o) }))} />
        ))}
      </Fields>
      <Actions><Submit icon={Save}>Save retention</Submit></Actions>
    </Form>
  );
}

export function EraseForm({ email }: { email: string }) {
  return (
    <Form action={eraseRequest}>
      <Hidden name="email" value={email} />
      <Fields>
        <Field name="confirm" label={`Type ${email} to erase it`} required hint="Names, addresses, phone numbers, answers and messages are removed. Numbers and dates stay, so counts and invoices still add up. It cannot be undone." />
      </Fields>
      <Actions><Submit tone="danger" icon={Eraser}>Erase</Submit></Actions>
    </Form>
  );
}
