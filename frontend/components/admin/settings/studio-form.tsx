"use client";

import { useState } from "react";
import { saveStudioSettings } from "@/lib/admin/settings-actions";
import { Panel } from "@/components/admin/bits";
import { Fields, Select, useFieldError } from "@/components/admin/form";
import { Chips, SettingsForm, Switch, Text } from "./kit";

const TERMS = [7, 14, 30, 45, 60, 90];

/** Settings, Studio and invoices: how a new invoice starts, and when unpaid ones are chased. */
export function StudioForm({ vatRate, vatOn, dueInDays, reminders, days }: {
  vatRate: number; vatOn: boolean; dueInDays: number; reminders: string[];
  days: { value: string; label: string }[];
}) {
  const [remOn, setRemOn] = useState(reminders.length > 0);
  const terms = TERMS.includes(dueInDays) ? TERMS : [...TERMS, dueInDays].sort((a, b) => a - b);
  return (
    <SettingsForm action={saveStudioSettings}>
      <Panel title="Invoice defaults" action={<span className="ad__dim adSet__aside">For new invoices and estimates</span>}>
        <div className="adSetPad">
          <Fields>
            <Text name="finance.vatRate" label="VAT" half suffix="%" inputMode="decimal" required
              pattern="\d{1,3}(\.\d{1,2})?" defaultValue={String(vatRate)} message="A number between 0 and 100, like 7.5." />
            <Select name="finance.dueInDays" label="Payment due" half defaultValue={String(dueInDays)}
              options={terms.map((d) => ({ value: String(d), label: `In ${d} days` }))} />
          </Fields>
        </div>
        <Switch name="finance.vatOn" label="Add VAT to new invoices" note="You can still change it on each invoice." defaultChecked={vatOn} />
      </Panel>

      <Panel title="Payment reminders">
        <Switch name="remindersOn" label="Email unpaid invoices automatically" note="Clients who turned reminders off are skipped."
          defaultChecked={reminders.length > 0} onChange={setRemOn} />
        {remOn ? <ReminderDays days={days} chosen={reminders.length ? reminders : ["-3", "0", "7"]} /> : null}
      </Panel>
    </SettingsForm>
  );
}

function ReminderDays({ days, chosen }: { days: { value: string; label: string }[]; chosen: string[] }) {
  const err = useFieldError("finance.reminders");
  return (
    <div className="adSetPad adSet__days">
      <Chips name="finance.reminders" legend="When to send a reminder" options={days} defaultValues={chosen} />
      {err ? <small className="ad__fe" role="alert">{err}</small> : null}
    </div>
  );
}
