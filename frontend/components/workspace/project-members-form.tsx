'use client';
import { UserPlus } from 'lucide-react';
import { DialogButton } from '@/components/admin/dialog';
import { Form, Hidden, Checks, Submit } from '@/components/admin/form';
import { RemoteSelect } from '@/components/admin/remote-pick';
import { saveProjectMember } from '@/lib/workspace/member-actions';
import { confirmClick } from '@/components/admin/confirm';

type Member = { name: string; email: string; role: string; manage: boolean; review: boolean; billing: boolean };
const ROLE: Record<string, string> = { owner: 'Owner', staff: 'Staff', client: 'Client' };
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?';

/**
 * PROJECT ACCESS (owner, 2026-11-01: pick people by name, keep it simple).
 * Search an active account by name or email instead of typing an exact address;
 * the action still receives the email, so its checks are unchanged.
 */
export function ProjectMembersForm({ projectId, members, readOnly }: { projectId: string; members: Member[]; readOnly: boolean }) {
  return <>
    <div className="wsAccess__head">
      <p className="ad__dim">The client and the project leads already have access. Add anyone else who needs it here.</p>
      {!readOnly ? <DialogButton label="Add a person" icon={UserPlus} title="Give someone access to this project">{close =>
        <Form action={saveProjectMember} onDone={close}>
          <Hidden name="projectId" value={projectId} />
          <RemoteSelect name="email" kind="accounts" label="Person" required placeholder="Search by name or email"
            hint="Anyone with an active account. Not listed? Invite them from Users first." />
          <Checks name="manage" label="Staff" long options={[{ value: 'on', label: 'Can manage this project' }]} />
          <Checks name="review" label="Client" long options={[{ value: 'on', label: 'Can review shared work' }]} />
          <Checks name="billing" label="Client billing" long options={[{ value: 'on', label: "Can see and approve this project's billing" }]} />
          <p className="ad__dim">Staff ticks only apply to staff, client ticks only to clients. Picking someone already listed updates what they can do.</p>
          <Submit>Save access</Submit>
        </Form>}
      </DialogButton> : null}
    </div>
    {members.length ? <ul className="wsAccess__list">{members.map(member => {
      const can = [member.manage ? 'Manages work' : '', member.review ? 'Reviews work' : '', member.billing ? 'Sees billing' : ''].filter(Boolean);
      return <li key={member.email}>
        <span className="wsAccess__avatar" aria-hidden="true">{initials(member.name)}</span>
        <span className="wsAccess__who"><b>{member.name}</b><small>{member.email}</small></span>
        <span className="wsAccess__can">
          <span className="ad__pill ad__pill--flat">{ROLE[member.role] ?? member.role}</span>
          {(can.length ? can : ['Reads shared work']).map((c) => <span key={c} className="wsAccess__perm">{c}</span>)}
        </span>
        {!readOnly ? <Form action={saveProjectMember}>
          <Hidden name="projectId" value={projectId} /><Hidden name="email" value={member.email} /><Hidden name="revoke" value="1" />
          <button className="ad__btn" type="submit" onClick={event => confirmClick(event, `Remove ${member.name}'s access to this project? The client and the project leads keep theirs; change those in the project's details.`)}>Remove</button>
        </Form> : null}
      </li>;
    })}</ul> : <p className="wsAccess__empty">Nobody else has been added yet.</p>}
  </>;
}
