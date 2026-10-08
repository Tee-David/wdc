"use client";

import { LogOut, Save } from "lucide-react";
import { saveMyName, signOutMyOtherSessions, signOutMySession, unlinkMyGoogle } from "@/lib/admin/account-actions";
import { Actions, Field, Fields, Form, Hidden, Submit } from "@/components/admin/form";

export function MyNameForm({ name }: { name: string }) {
  return (
    <Form action={saveMyName}>
      <Fields><Field name="name" label="Your name" defaultValue={name} required hint="As it appears on what you change." /></Fields>
      <Actions><Submit icon={Save}>Save name</Submit></Actions>
    </Form>
  );
}

export function SignOutOne({ id, label }: { id: string; label: string }) {
  return (
    <Form action={signOutMySession} confirm={`Sign out ${label}?`}>
      <Hidden name="session" value={id} />
      <Actions><Submit tone="plain" icon={LogOut}>Sign out</Submit></Actions>
    </Form>
  );
}

export function SignOutOthers() {
  return (
    <Form action={signOutMyOtherSessions} confirm="Sign out every other session? This one stays signed in.">
      <Actions><Submit tone="plain" icon={LogOut}>Sign out everywhere else</Submit></Actions>
    </Form>
  );
}

export function UnlinkGoogle() {
  return (
    <Form action={unlinkMyGoogle} confirm="Unlink Google? You will sign in with your password or an emailed link.">
      <button className="ad__btn" type="submit">Unlink Google</button>
    </Form>
  );
}
