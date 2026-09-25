"use client";

import { useState } from "react";
import { KeyRound, LogOut, Save } from "lucide-react";
import { signOutOtherDevices, updateMyDetails, updateNotifyPrefs } from "@/lib/portal/actions";
import { Field, Form, Submit } from "@/components/admin/form";
import { Switch } from "@/components/admin/settings/kit";
import { PasswordChange } from "@/components/account/password-change";
import { NOTIFY_KINDS, notifyAllows, type Client, type NotifyKind } from "@/lib/admin/types";

/** The client's own name and phone. Email and company are shown, not edited. */
export function ProfileForm({ client }: { client: Client }) {
  return (
    <Form action={updateMyDetails} className="pSet__form">
      <Field name="name" label="Contact name" required defaultValue={client.name} />
      <div className="pSet__fixed">
        <span>Company</span>
        <b>{client.company}</b>
      </div>
      <div className="pSet__fixed">
        <span>Email</span>
        <b>{client.email}</b>
        <small>This is the address you sign in with, so it changes through Support rather than here.</small>
      </div>
      <Field name="phone" label="Phone" type="tel" inputMode="tel" defaultValue={client.phone} placeholder="+234 803 555 0142" />
      <div className="pSet__act"><Submit tone="primary" icon={Save}>Save details</Submit></div>
    </Form>
  );
}

const NOTIFY: Record<NotifyKind, { label: string; note: string }> = {
  updates: { label: "A project update or something to review", note: "Email" },
  reminders: { label: "An invoice is due or overdue", note: "Email" },
  marketing: { label: "Occasional studio news", note: "Email, a few times a year" },
};

/** What we email this client about, as switches. Every one can be turned off. */
export function NotifyForm({ client }: { client: Client }) {
  return (
    <Form action={updateNotifyPrefs} className="pSet__notify">
      {NOTIFY_KINDS.map((k) => (
        <Switch key={k} name={k} label={NOTIFY[k].label} note={NOTIFY[k].note} defaultChecked={notifyAllows(client.notify, k)} />
      ))}
      <div className="pSet__act"><Submit tone="primary" icon={Save}>Save preferences</Submit></div>
    </Form>
  );
}

/** Password and devices. The password form opens in place when asked for. */
export function SignInCard({ email, hasPassword }: { email: string; hasPassword: boolean }) {
  const [changing, setChanging] = useState(false);
  return (
    <div className="pSet__signin">
      <div className="adSR adSR__first">
        <span className="pSet__rowIcon ad__tileIcon ad__tileIcon--neutral" aria-hidden="true"><KeyRound /></span>
        <span className="adSR__text">
          <b>Password</b>
          <small>{hasPassword ? "Change it with a code we email you." : "You sign in with emailed links. Set a password if you would rather."}</small>
        </span>
        <span className="adSR__ctl">
          <button type="button" className="ad__btn" aria-expanded={changing} onClick={() => setChanging((x) => !x)}>
            {changing ? "Cancel" : hasPassword ? "Change" : "Set one"}
          </button>
        </span>
      </div>
      {changing ? <div className="adSetPad"><PasswordChange email={email} hasPassword={hasPassword} /></div> : null}
      <Form action={signOutOtherDevices} confirm="Sign out every other phone and browser? This one stays signed in.">
        <div className="adSR">
          <span className="pSet__rowIcon ad__tileIcon ad__tileIcon--neutral" aria-hidden="true"><LogOut /></span>
          <span className="adSR__text">
            <b>Sign out everywhere else</b>
            <small>Phones and other browsers. This one stays signed in.</small>
          </span>
          <span className="adSR__ctl"><Submit tone="plain">Sign out</Submit></span>
        </div>
      </Form>
    </div>
  );
}
