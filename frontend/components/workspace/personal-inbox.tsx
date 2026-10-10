import { requireWorkspaceUser } from '@/lib/workspace/access';
import { listWorkspaceNotifications, getWorkspaceNotificationPreferences } from '@/lib/workspace/notifications-store';
import { NotificationInbox } from './notifications-inbox';
import { Panel } from '@/components/admin/bits';

export async function PersonalInbox() {
  const user=await requireWorkspaceUser();
  let data=null;
  try {
    const [notifications,preferences]=await Promise.all([listWorkspaceNotifications('all'),getWorkspaceNotificationPreferences()]);
    data={notifications,preferences};
  } catch { /* Keep an unavailable inbox distinct from an empty one. */ }
  return data?<NotificationInbox {...data} readOnly={user.readOnly}/>:<Panel title="Inbox unavailable"><p role="alert">Your messages could not be loaded. Check the workspace migrations, then refresh. Your saved history has not been replaced.</p></Panel>;
}
