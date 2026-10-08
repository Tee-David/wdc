"use client";

import { useState } from "react";
import { Activity, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { KINDS, type Kind } from "@/lib/mail-kinds";
import {
  checkConnectionAction, checkDomainAction, deleteConnectionAction, newEventsKeyAction, saveConnectionAction, saveRoutingAction, setSimulateAction, testConnectionAction,
} from "@/lib/admin/mail-connection-actions";
import { Actions, Field, Fields, Form, Hidden, Select, Submit, Wrap } from "../form";
import { Pick } from "../pick";
import { DialogButton } from "../dialog";

export type ConnView = {
  id: string; kind: Kind; name: string; fromEmail: string; settings: Record<string, string>; saved: string[];
  health: { status: "ok" | "error"; message: string; at: string } | null;
};

/** Add or edit a connection. Secrets show as "saved"; leaving one blank keeps it. */
export function ConnectionForm({ conn, close }: { conn?: ConnView; close: () => void }) {
  const [kind, setKind] = useState<Kind>(conn?.kind ?? "postmark");
  const def = KINDS[kind];
  return (
    <Form action={saveConnectionAction} onDone={close}>
      {conn ? <Hidden name="id" value={conn.id} /> : null}
      <Hidden name="kind" value={kind} />
      <Fields>
        {conn ? null : (
          <Wrap name="kind" label="Service" required>
            {(id) => <Pick id={id} value={kind} label="Service" onChange={(v) => setKind(v as Kind)}
              options={(Object.keys(KINDS) as Kind[]).map((k) => ({ value: k, label: KINDS[k].label }))} />}
          </Wrap>
        )}
        <Field name="name" label="Name" required defaultValue={conn?.name} placeholder={`${def.label} for newsletters`} />
        <Field name="fromEmail" label="Sending address" required type="email" defaultValue={conn?.fromEmail} hint="It must be one this service has verified for you." />
        {def.fields.map((f) => <Field key={`${kind}-${f.key}`} name={`f_${f.key}`} label={f.label} defaultValue={conn?.settings[f.key]} placeholder={f.placeholder} hint={f.hint} />)}
        {def.secrets.map((s) => (
          <Field key={`${kind}-${s.key}`} name={`s_${s.key}`} label={s.label} type="password" required={!conn?.saved.includes(s.key)}
            placeholder={conn?.saved.includes(s.key) ? "Saved. Leave blank to keep it." : ""} hint="Stored encrypted and never shown again." />
        ))}
      </Fields>
      <Actions><Submit>{conn ? "Save changes" : "Add connection"}</Submit></Actions>
    </Form>
  );
}

export function AddConnection() {
  return <DialogButton label="Add a connection" title="Add a connection" icon={Plus} wide>{(close) => <ConnectionForm close={close} />}</DialogButton>;
}

export function ConnectionActions({ conn }: { conn: ConnView }) {
  return (
    <span className="ad__row" style={{ flexWrap: "wrap" }}>
      <Form action={checkConnectionAction}><Hidden name="id" value={conn.id} /><Submit tone="plain" icon={Activity}>Check</Submit></Form>
      <Form action={testConnectionAction}><Hidden name="id" value={conn.id} /><Submit tone="plain" icon={Send}>Send me a test</Submit></Form>
      <DialogButton label="Edit" title={`Edit ${conn.name}`} icon={Pencil} tone="plain" wide>{(close) => <ConnectionForm conn={conn} close={close} />}</DialogButton>
      <Form action={deleteConnectionAction} confirm={`Remove ${conn.name}? Mail stops going through it. This cannot be undone, and its saved key is deleted.`}>
        <Hidden name="id" value={conn.id} /><Submit tone="danger" icon={Trash2}>Remove</Submit>
      </Form>
    </span>
  );
}

export function EnvTest() {
  return <Form action={testConnectionAction}><Hidden name="id" value="env" /><Submit tone="plain" icon={Send}>Send me a test</Submit></Form>;
}

export function RoutingForm({ options, def, fallback, webhook, digest }: { options: { value: string; label: string }[]; def: string; fallback: string; webhook: string; digest: boolean }) {
  return (
    <Form action={saveRoutingAction}>
      <Fields>
        <Select name="default" label="Send everything through" half defaultValue={def} options={options} hint="The studio's own server stays the default until you pick another." />
        <Select name="fallback" label="If that fails, try" half defaultValue={fallback} placeholder="Nothing" options={options} hint="One retry through a different connection, behind the response." />
        <Field name="webhook" label="Alert me on failure (Slack or Discord)" defaultValue={webhook} placeholder="https://hooks.slack.com/services/…" hint="An incoming-webhook address. At most one alert a minute." />
        <label className="ad__check"><input type="checkbox" name="digest" value="1" defaultChecked={digest} /> <span>Email me a summary every Monday: sent, failed and the busiest subjects.</span></label>
      </Fields>
      <Actions><Submit>Save</Submit></Actions>
    </Form>
  );
}

export function EventsKey({ has }: { has: boolean }) {
  return <Form action={newEventsKeyAction} confirm={has ? "Make a new address? The old one stops working, so paste the new one into the mail service." : undefined}><Submit tone="plain">{has ? "Make a new address" : "Make the address"}</Submit></Form>;
}

export function DomainCheck({ defaultDomain }: { defaultDomain: string }) {
  return (
    <Form action={checkDomainAction}>
      <Fields><Field name="domain" label="Your sending domain" defaultValue={defaultDomain} placeholder="wedigcreativity.com" hint="Looks up SPF, common DKIM names and DMARC." /></Fields>
      <Actions><Submit>Check it</Submit></Actions>
    </Form>
  );
}

export function SimulateSwitch({ on }: { on: boolean }) {
  return (
    <Form action={setSimulateAction}>
      <Hidden name="on" value={on ? "0" : "1"} />
      <Submit tone={on ? "primary" : "plain"}>{on ? "Turn simulate mode off" : "Turn simulate mode on"}</Submit>
    </Form>
  );
}
