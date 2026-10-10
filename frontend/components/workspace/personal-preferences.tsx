import { getWorkspaceNotificationPreferences } from '@/lib/workspace/notifications-store';
import { requireWorkspaceUser } from '@/lib/workspace/access';
import { NotificationPreferencesForm } from './notifications-inbox';
import { Panel } from '@/components/admin/bits';
export async function PersonalNotificationPreferences(){
  const user=await requireWorkspaceUser();
  let preferences=null;
  try {preferences=await getWorkspaceNotificationPreferences();}catch{/* Unavailable is not a default preference. */}
  return <Panel title="Your project email preferences" dataTour="workspace-preferences">{user.readOnly?<p>This view is read-only. Exit support view to change personal email preferences.</p>:preferences?<NotificationPreferencesForm preferences={preferences}/>:<p role="alert">Preferences could not be loaded. Check the workspace migrations, then refresh.</p>}</Panel>;
}
