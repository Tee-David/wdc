"use client";

import { KeyRound, LogOut, Save } from "lucide-react";
import { changeMyPassword, saveMyName, signOutMyOtherSessions, unlinkMyGoogle } from "@/lib/admin/account-actions";
import { Actions, Field, Fields, Form, Submit } from "@/components/admin/form";

export function MyNameForm({ name }: { name: string }) {
  return (
    <Form action={saveMyName}>
      <Fields><Field name="name" label="Your name" defaultValue={name} required hint="As it appears on what you change." /></Fields>
      <Actions><Submit icon={Save}>Save name</Submit></Actions>
    </Form>
  );
}

export function MyPasswordForm() {
  return (
    <Form action={changeMyPassword} resetOnDone>
      <Fields>
        <Field name="current" label="Current password" type="password" required />
        <Field name="next" label="New password" type="password" half required hint="8+ characters, with a capital, a small letter, a number and a symbol." />
        <Field name="again" label="New password again" type="password" half required />
      </Fields>
      <Actions><Submit icon={KeyRound}>Change password</Submit></Actions>
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
