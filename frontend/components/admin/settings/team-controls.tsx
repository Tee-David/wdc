"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { inviteStaff, revokeInvite } from "@/lib/admin/invite-actions";
import { deactivateMember, reactivateMember, setTeamRole, signOutMember } from "@/lib/admin/team-actions";
import { Actions, Fields, Form, Hidden, Radios, Submit } from "@/components/admin/form";
import { Text } from "./kit";

/**
 * Invite someone to the admin: a link that works once, for a week, for that
 * address only. The role is chosen here rather than by a "Make owner" after
 * they have signed in, and an owner invitation is asked about once more,
 * because it hands over everything, money and this page included.
 */
export function InviteStaffForm() {
  const [role, setRole] = useState("staff");
  return (
    <Form action={inviteStaff} resetOnDone onDone={() => setRole("staff")}
      confirm={role === "owner" ? "Invite them as an owner? An owner can do everything, including money, settings and changing who has access." : undefined}>
      <Fields>
        <Text name="name" label="Their name" half required message="Add their name." autoComplete="off" />
        <Text name="email" label="Email" type="email" half required message="Enter an email like name@example.com." autoComplete="off" />
      </Fields>
      <div className="adTeam__role" onChange={(e) => { const t = e.target as HTMLInputElement; if (t.name === "role") setRole(t.value); }}>
        <Radios name="role" label="Role" defaultValue="staff" options={[
          { value: "staff", label: "Staff", note: "Clients, projects, forms and content. Not money, settings or the team." },
          { value: "owner", label: "Owner", note: "Everything, including money, settings and the team." },
        ]} />
      </div>
      <Actions><Submit icon={UserPlus}>Send invitation</Submit></Actions>
    </Form>
  );
}

export function InvitationRow({ id, name, email, role }: { id: string; name: string; email: string; role: "owner" | "staff" }) {
  return (
    <span className="ad__row">
      <Form action={inviteStaff}>
        <Hidden name="name" value={name} />
        <Hidden name="email" value={email} />
        <Hidden name="role" value={role} />
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
