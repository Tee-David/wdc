import 'server-only';
import { getClients } from '@/lib/admin/store';
import { notificationPreferences,type NotificationPreferences } from './notifications-policy';
/** An explicit per-person save takes precedence. Never turn a prior client opt-out back on by default. */
export function effectiveWorkspacePreferences(email:string,modes:unknown,digestDays:unknown):NotificationPreferences {
 const prefs=notificationPreferences(modes,digestDays);
 if(modes!==null&&modes!==undefined)return prefs;
 const client=getClients({includeArchived:true}).find(c=>c.email.trim().toLowerCase()===email.trim().toLowerCase());
 if(client?.notify?.updates===false)for(const key of ['actions','progress','support','billing','reminders'] as const)prefs.modes[key]='off';
 if(client?.notify?.reminders===false)prefs.modes.reminders='off';
 return prefs;
}
