"use client";

import { UserPlus } from "lucide-react";
import { inviteStaff, revokeInvite } from "@/lib/admin/invite-actions";
import { deactivateMember, reactivateMember, setTeamRole, signOutMember } from "@/lib/admin/team-actions";
import { Actions, Fields, Form, Hidden, Submit } from "@/components/admin/form";
import { Text } from "./kit";

/** Invite a member of staff: a link that works once, for a week, for that address only. */
export function InviteStaffForm() {
  return (
    <Form action={inviteStaff} resetOnDone>
      <Fields>
        <Text name="name" label="Their name" half required message="Add their name." autoComplete="off" />
        <Text name="email" label="Email" type="email" half required message="Enter an email like name@example.com." autoComplete="off" />
      </Fields>
      <Actions><Submit icon={UserPlus}>Send invitation</Submit></Actions>
    </Form>
  );
}

export function InvitationRow({ id, name, email }: { id: string; name: string; email: string }) {
  return (
    <span className="ad__row">
      <Form action={inviteStaff}>
        <Hidden name="name" value={name} />
        <Hidden name="email" value={email} />
        <button className="ad__btn" type="submit">Send again</button>
      </Form>
      <Form action={revokeInvite} confirm={`Withdraw the invitation to ${email}? The link stops working.`}>
        <Hidden name="id" value={id} />
        <Hidden name="back" value="/admin/settings/team" />
        <button className="ad__btn" type="submit">Withdraw</button>
      </Form>
    </span>
  );
}

/** What an owner can do to somebody else's access. Never shown on their own row. */
export function MemberControls({ id, name, role, active }: { id: string; name: string; role: "owner" | "staff"; active: boolean }) {
  return (
    <span className="ad__row">
      {active ? (
        <>
          <Form action={setTeamRole} confirm={role === "owner" ? `Make ${name} staff? They lose money, settings and the team, and are signed out.` : `Make ${name} an owner? They can do everything, including this.`}>
            <Hidden name="id" value={id} />
            <Hidden name="role" value={role === "owner" ? "staff" : "owner"} />
            <button className="ad__btn" type="submit">{role === "owner" ? "Make staff" : "Make owner"}</button>
          </Form>
          <Form action={signOutMember} confirm={`Sign ${name} out everywhere? They can sign straight back in.`}>
            <Hidden name="id" value={id} />
            <button className="ad__btn" type="submit">Sign out everywhere</button>
          </Form>
          <Form action={deactivateMember} confirm={`Deactivate ${name}? They are signed out now and cannot sign in until reactivated. Their name stays on what they changed.`}>
            <Hidden name="id" value={id} />
            <button className="ad__btn ad__btn--danger" type="submit">Deactivate</button>
          </Form>
        </>
      ) : (
        <Form action={reactivateMember}>
          <Hidden name="id" value={id} />
          <button className="ad__btn" type="submit">Reactivate</button>
        </Form>
      )}
    </span>
  );
}
