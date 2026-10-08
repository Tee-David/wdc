"use client";

import { useState } from "react";
import { saveNotificationSettings } from "@/lib/admin/settings-actions";
import { Panel } from "@/components/admin/bits";
import { SettingsForm, Switch, Text } from "./kit";

/** Settings, Notifications: every email the studio itself receives, switched in one place. */
export function NotificationsForm({ tickets, payments, staff, forms, alertTo, inbox }: {
  tickets: boolean; payments: boolean; staff: boolean; alertTo: string; inbox: string;
  forms: { key: string; title: string; on: boolean }[];
}) {
  const [alertOn, setAlertOn] = useState(Boolean(alertTo));
  return (
    <SettingsForm action={saveNotificationSettings}>
      <Panel title="Email the studio when" action={<span className="ad__dim adSet__aside">To {inbox}</span>}>
        <Switch name="notify.tickets" label="A client opens or replies to a ticket" defaultChecked={tickets} />
        <Switch name="notify.staff" label="A new staff member finishes their welcome" defaultChecked={staff} />
        <Switch name="notify.payments" label="A client pays online" defaultChecked={payments} />
      </Panel>
      <Panel title="A form is sent">
        {forms.map((f) => (
          <Switch key={f.key} name={`form.${f.key}`} label={f.title} defaultChecked={f.on} />
        ))}
      </Panel>
      <Panel title="When an email fails">
        <Switch name="failAlert" label="Tell me when an email bounces or fails" note="A list, at most once an hour." defaultChecked={Boolean(alertTo)} onChange={setAlertOn} />
        {alertOn ? (
          <div className="adSetPad adSet__days">
            <Text name="failTo" label="Send alerts to" type="email" required defaultValue={alertTo || inbox}
              message="Enter an email like name@example.com." autoComplete="email" />
          </div>
        ) : null}
      </Panel>
    </SettingsForm>
  );
}
