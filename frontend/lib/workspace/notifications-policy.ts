export const NOTIFICATION_CATEGORIES = ['actions','progress','support','billing','reminders'] as const;
export type NotificationCategory = typeof NOTIFICATION_CATEGORIES[number];
export type EmailMode = 'immediate' | 'digest' | 'off';
export type NotificationPreferences = { modes: Record<NotificationCategory,EmailMode>; digestDays: 1 | 7 };
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {modes:{actions:'immediate',progress:'digest',support:'immediate',billing:'immediate',reminders:'immediate'},digestDays:7};
export function notificationPreferences(modes: unknown, digestDays: unknown): NotificationPreferences {
 const values = modes && typeof modes === 'object' ? modes as Record<string,unknown> : {};
 const result = {...DEFAULT_NOTIFICATION_PREFERENCES.modes};
 for (const category of NOTIFICATION_CATEGORIES) { const value=values[category]; if(value==='immediate'||value==='digest'||value==='off') result[category]=value; }
 return {modes:result,digestDays:digestDays===1?1:7};
}
/** Only relative dashboard records: emails cannot point to arbitrary supplied hosts. */
export function workspaceHref(href:string) {
 if(!/^\/(?:admin|portal)\//.test(href)||href.includes('\\')||/[\r\n]/.test(href)) throw new Error('A dashboard record link is required.');
 return href;
}
export function dueDate(value?:string|null) {
 if(!value)return null;
 if(!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/.test(value))throw new Error('Choose a valid deadline.');
 const day=value.slice(0,10),calendar=new Date(`${day}T12:00:00.000Z`);
 if(!Number.isFinite(calendar.getTime())||calendar.toISOString().slice(0,10)!==day)throw new Error('Choose a real calendar date.');
 // The existing calendar posts a local wall time; studio scheduling uses Africa/Lagos (UTC+01).
 const instant=value.length===10?`${day}T12:00:00.000Z`:/Z$|[+-]\d{2}:\d{2}$/.test(value)?value:`${value}+01:00`;
 const date=new Date(instant); if(!Number.isFinite(date.getTime()))throw new Error('Choose a valid deadline.');
 return date.toISOString();
}
export function deadlinePickerValue(value:string|null){return value?new Date(new Date(value).getTime()+3_600_000).toISOString().slice(0,16):'';}
