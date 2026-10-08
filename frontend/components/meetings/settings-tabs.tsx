"use client";

import { useRef } from "react";
import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { Panel } from "@/components/admin/bits";
import { SettingsForm, Switch, Text, Row } from "@/components/admin/settings/kit";
import { Pick } from "@/components/admin/pick";
import { bookingBlockers, type Blocker, type WebhookState } from "@/lib/meetings/errors";
import type { ActionState } from "@/lib/admin/validate";
import type { Schedule, MeetingType } from "@/lib/meetings/cal";
import { ScheduleEditor } from "./schedule-editor";

export type Setup = {
  config: { enabled: boolean; event_type_id: number | null; schedule_id: number | null; settings: Record<string, unknown> };
  types: MeetingType[];
  schedules: Schedule[];
  calendarConnected: boolean;
  googleMeetConnected: boolean;
  webhook: WebhookState;
  webhookConfigured: boolean;
  reminders: { available: boolean; reason: string };
};

export const TABS = ["Availability", "Booking rules", "Reminders", "Connections"] as const;
export type Tab = (typeof TABS)[number];

type FormAction = (previous: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Sections as a real tab list: one tab stop, arrow keys, Home and End, 44px
 * targets, and it scrolls sideways on a phone (the `ad__tabsNav` pattern the
 * Email page uses, with buttons because these switch a panel, not a page).
 */
export function SectionTabs({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  function onKeyDown(event: React.KeyboardEvent) {
    const at = TABS.indexOf(tab);
    const moves: Record<string, number> = { ArrowRight: (at + 1) % TABS.length, ArrowLeft: (at + TABS.length - 1) % TABS.length, Home: 0, End: TABS.length - 1 };
    const to = moves[event.key];
    if (to === undefined) return;
    event.preventDefault();
    onChange(TABS[to]);
    refs.current[to]?.focus();
  }
  return (
    <div className="ad__tabsNav" role="tablist" aria-label="Scheduling sections" onKeyDown={onKeyDown}>
      {TABS.map((name, i) => (
        <button
          key={name}
          ref={(node) => { refs.current[i] = node; }}
          type="button"
          role="tab"
          id={`meet-tab-${i}`}
          aria-selected={tab === name}
          aria-controls="meet-panel"
          tabIndex={tab === name ? 0 : -1}
          onClick={() => onChange(name)}
        >
          {name}
        </button>
      ))}
    </div>
  );
}

/** Working hours. The state of the meeting type decides what is shown; a button appears only when it can fix something. */
export function AvailabilityTab({ data, busy, onSetup, onSave }: { data: Setup; busy: boolean; onSetup: () => void; onSave: FormAction }) {
  const { config, schedules } = data;
  const schedule = schedules.find((s) => String(s.id) === String(config.schedule_id));
  let body: React.ReactNode;
  if (schedule) {
    const key = `${schedule.id}-${JSON.stringify(schedule.availability)}-${JSON.stringify(schedule.overrides)}`;
    body = <SettingsForm action={onSave}><ScheduleEditor key={key} schedule={schedule} /></SettingsForm>;
  } else if (!config.event_type_id) {
    body = (
      <div className="meetEmpty">
        <p>Your working hours show here once the meeting type is set up. Use <b>Set up now</b> in the panel above.</p>
      </div>
    );
  } else if (!schedules.length) {
    body = (
      <div className="meetEmpty">
        <p>The meeting type exists, but your Cal.com account has no working-hours schedule to link. Create one in Cal.com, then link it here.</p>
        <div className="meetActions">
          <a className="ad__btn" href="https://app.cal.com/availability" target="_blank" rel="noopener noreferrer">Open Cal.com availability</a>
          <button type="button" className="ad__btn ad__btn--plain" disabled={busy} onClick={onSetup}>{busy ? "Linking…" : "Link schedule"}</button>
        </div>
      </div>
    );
  } else {
    body = (
      <div className="meetEmpty">
        <p>The meeting type exists, but it is not linked to one of your Cal.com schedules yet. Linking does not create anything new.</p>
        <button type="button" className="ad__btn" disabled={busy} onClick={onSetup}>{busy ? "Linking…" : "Link schedule"}</button>
      </div>
    );
  }
  return <Panel title="Your working hours"><div className="meetBody">{body}</div></Panel>;
}

/** Why bookings cannot be turned on yet, each with the fix beside it (a disabled control explains itself). */
function Blockers({ blockers, busy, onSetup, onRecheck, goConnections }: {
  blockers: Blocker[]; busy: boolean; onSetup: () => void; onRecheck: () => void; goConnections: () => void;
}) {
  if (!blockers.length) return null;
  return (
    <div className="meetBlockers" role="group" aria-label="Before bookings can be turned on">
      <p className="meetBlockersH"><CircleAlert aria-hidden="true" /> The switch above is off until these are done</p>
      <ul>
        {blockers.map((b) => (
          <li key={b.id}>
            <span>{b.reason}</span>
            <button
              type="button"
              className="ad__btn ad__btn--plain"
              disabled={busy && b.id !== "calendar" && b.id !== "meet"}
              onClick={b.id === "setup" ? onSetup : b.fix === "Re-check" ? onRecheck : goConnections}
            >
              {b.fix}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BookingRulesTab({ data, busy, ack, onAck, onSetup, onRecheck, goConnections, onSave }: {
  data: Setup; busy: boolean; ack: boolean; onAck: (on: boolean) => void;
  onSetup: () => void; onRecheck: () => void; goConnections: () => void; onSave: FormAction;
}) {
  const { config } = data;
  const blockers = bookingBlockers({
    hasEventType: !!config.event_type_id, calendar: data.calendarConnected, meet: data.googleMeetConnected, webhook: data.webhook, webhookAck: ack,
  });
  // Switching OFF is never blocked, or a published page could not be unpublished once a connection lapsed.
  const locked = !config.enabled && blockers.length > 0;
  // An unconfirmed webhook has its own box below, with the Re-check and the tick; listing it twice is noise.
  const listed = data.webhook === "unconfirmed" ? blockers.filter((b) => b.id !== "webhook") : blockers;
  return (
    <Panel title="How meetings are booked">
      <div className="meetBody">
        <SettingsForm action={onSave}>
          <Switch
            name="enabled"
            label="Accept new meeting bookings"
            note="Publish only after you have reviewed the schedule, calendar connections and webhook setup."
            defaultChecked={config.enabled}
            disabled={locked}
          />
          {locked && listed.length ? <Blockers blockers={listed} busy={busy} onSetup={onSetup} onRecheck={onRecheck} goConnections={goConnections} /> : null}
          {data.webhook === "unconfirmed" ? (
            <div className="meetBlockers">
              <p className="meetBlockersH"><CircleAlert aria-hidden="true" /> We could not confirm the webhook secret</p>
              <p>Cal.com registered the webhook but did not show its secret, so we cannot compare it with the server’s. Re-check, or confirm it yourself in Cal.com and tick below.</p>
              <div className="meetActions">
                <button type="button" className="ad__btn ad__btn--plain" disabled={busy} onClick={onRecheck}>Re-check</button>
              </div>
              <Switch
                name="webhookAck"
                label="I have confirmed the webhook secret in Cal.com"
                note="Publish anyway. Only tick this once the secret on the Cal.com webhook matches the server’s CAL_WEBHOOK_SECRET; if it does not, booking changes will not reach this site."
                defaultChecked={false}
                onChange={onAck}
              />
            </div>
          ) : null}
          <Row label="Meeting duration" labelId="meet-duration">
            <Pick
              name="duration"
              labelledBy="meet-duration"
              defaultValue={String(config.settings.lengthInMinutes || 30)}
              options={[15, 30, 45, 60].map((n) => ({ value: String(n), label: `${n} minutes` }))}
            />
          </Row>
          <Text name="notice" label="Minimum notice, in minutes" type="number" min={60} max={43200} defaultValue={Number(config.settings.minimumBookingNotice || 1440)} hint="1440 minutes is one day. Times inside this window are not offered." />
          <Text name="buffer" label="Buffer before and after, in minutes" type="number" min={0} max={120} defaultValue={Number(config.settings.beforeEventBuffer ?? 15)} hint="Time kept free around each conversation." />
        </SettingsForm>
      </div>
    </Panel>
  );
}

export function RemindersTab({ data, goConnections }: { data: Setup; goConnections: () => void }) {
  return (
    <Panel title="Meeting notices and reminders">
      <div className="meetBody">
        <strong>One notification owner: Cal.com</strong>
        <p className="meetHint">Calendar confirmations, rescheduling and cancellation notices are managed by Cal.com. WDC does not send duplicates.</p>
        <Row label="Optional attendee reminders" note={data.reminders.reason}>
          <button type="button" className="ad__btn ad__btn--plain" disabled>Off · setup required</button>
        </Row>
        <p className="meetHint">24-hour and 1-hour reminders will only be enabled after their workflow, individual opt-out and suppression on changes are verified. We do not claim an email was delivered without delivery evidence.</p>
        <Row label="SMS and WhatsApp" note="Keep off until provider support, charges and explicit recipient consent are verified.">
          <button type="button" className="ad__btn ad__btn--plain" disabled>Off</button>
        </Row>
        <div className="meetActions">
          <a className="ad__btn" href="https://app.cal.com/workflows" target="_blank" rel="noopener noreferrer">Review Cal.com workflows</a>
          <button type="button" className="ad__btn ad__btn--plain" onClick={goConnections}>Check setup</button>
        </div>
      </div>
    </Panel>
  );
}

const WEBHOOK_WORDS: Record<WebhookState, string> = {
  ready: "Registered and checked",
  unconfirmed: "Registered, but we could not confirm the secret",
  not_registered: "Not registered in Cal.com",
  secret_mismatch: "Registered, but the secret differs from the server’s",
  no_secret: "The server has no CAL_WEBHOOK_SECRET",
};

export function ConnectionsTab({ data, busy, onRecheck }: { data: Setup; busy: boolean; onRecheck: () => void }) {
  return (
    <Panel title="Connections and recovery">
      <div className="meetBody">
        <p>Calendar: <strong>{data.calendarConnected ? "Connected with a destination calendar" : "Connection required"}</strong></p>
        <p>Google Meet: <strong>{data.googleMeetConnected ? "Connected" : "Connection required"}</strong></p>
        <p>Signed booking webhook: <strong>{WEBHOOK_WORDS[data.webhook]}</strong></p>
        <p className="meetHint">Calendar access is separate from signing in to WDC with Google. Google and Apple calendars are configured in your Cal.com account; WDC never stores their passwords.</p>
        <div className="meetActions">
          <a className="ad__btn" href="https://app.cal.com/settings/my-account/calendars" target="_blank" rel="noopener noreferrer">Manage calendars</a>
          <a className="ad__btn ad__btn--plain" href="https://app.cal.com/apps" target="_blank" rel="noopener noreferrer">Manage video apps</a>
          <button type="button" className="ad__btn ad__btn--plain" disabled={busy} onClick={onRecheck}>{busy ? "Checking…" : "Re-check connections"}</button>
        </div>
        <p className="meetHint">
          The webhook points Cal.com at <code>/api/meetings/webhook</code> on this site. Its secret must equal the server’s <code>CAL_WEBHOOK_SECRET</code>, which is set in the hosting environment, not here.
          Recovery retains received changes and pending commands if a worker stops; uncertain provider changes need checking before retry.
        </p>
        <Link className="meetLink" href="/admin/meetings">View meetings</Link>
      </div>
    </Panel>
  );
}
