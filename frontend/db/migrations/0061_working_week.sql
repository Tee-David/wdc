-- A person's working days (Settings, You, Notifications and week). The morning
-- email (lib/jobs/staff-day.ts) goes out only on these days. Mon=1 .. Sun=7.
ALTER TABLE workspace_notification_preferences ADD COLUMN IF NOT EXISTS work_days STRING NOT NULL DEFAULT '1,2,3,4,5';
