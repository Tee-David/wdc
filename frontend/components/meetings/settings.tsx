"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, CircleAlert } from "lucide-react";
import { Panel } from "@/components/admin/bits";
import { toast } from "@/components/admin/toast";
import {
  checkMeetingCommand, clearMeetingCommand, meetingCommand, MeetingPending, MeetingRequestError, pendingMeetingCommand,
  type StoredCommand,
} from "./client";
import { describeMeetingError, isMeetingErrorCode, loadFailureCode, type MeetingErrorAction } from "@/lib/meetings/errors";
import type { ActionState } from "@/lib/admin/validate";
import { AvailabilityTab, BookingRulesTab, ConnectionsTab, RemindersTab, SectionTabs, TABS, type Setup, type Tab } from "./settings-tabs";
import "./meetings.css";

/** What the owner is shown when something fails: words, then the next actions. */
type Problem = { title: string; message: string; actions: MeetingErrorAction[]; retry: "load" | "setup" };

const ACTION_LABEL: Record<string, string> = { setup: "Your setup request", settings: "Your booking rules change", availability: "Your availability change" };

/** A refused request carries a code the mapper explains; anything else keeps its own words. */
function problemFor(error: unknown, retry: Problem["retry"], title: string): Problem {
  if (error instanceof MeetingRequestError && error.code) return { ...describeMeetingError(error.code), retry };
  const message = error instanceof Error && error.message ? error.message : "Something went wrong.";
  return { title, message, actions: [{ kind: "retry", label: "Retry" }], retry };
}

function ProblemAlert({ problem, busy, onRetry, onSetup }: { problem: Problem; busy: boolean; onRetry: () => void; onSetup: () => void }) {
  return (
    <div className="meetAlert" role="alert">
      <p className="meetAlertH"><CircleAlert aria-hidden="true" /> {problem.title}</p>
      <p>{problem.message}</p>
      <div className="meetActions">
        {problem.actions.map((action) => {
          if (action.kind === "link") {
            const external = action.href.startsWith("http");
            return <Link key={action.label} className="ad__btn" href={action.href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{action.label}</Link>;
          }
          return (
            <button key={action.label} type="button" className="ad__btn" disabled={busy} onClick={action.kind === "setup" ? onSetup : onRetry}>
              {busy ? "Checking…" : action.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** A saved change that Cal.com has not confirmed. It never blocks the page: check it, or stop waiting for it. */
function PendingBanner({ command, state, note, busy, onCheck, onStop }: {
  command: StoredCommand; state: string; note: string; busy: boolean; onCheck: () => void; onStop: () => void;
}) {
  return (
    <div className="meetAlert" role="status">
      <p className="meetAlertH"><CircleAlert aria-hidden="true" /> {ACTION_LABEL[command.action] ?? "Your change"} is saved but not confirmed yet</p>
      <p>{note || "Cal.com has not confirmed it. Nothing is repeated automatically."}</p>
      <div className="meetActions">
        <button type="button" className="ad__btn" disabled={busy} onClick={onCheck}>{busy ? "Checking…" : "Check again"}</button>
        {state === "uncertain" || state === "blocked" ? <button type="button" className="ad__btn ad__btn--plain" disabled={busy} onClick={onStop}>Stop waiting for it</button> : null}
      </div>
    </div>
  );
}

/** First-run panel: shown until the private meeting type exists. */
function SetupPanel({ busy, onSetup }: { busy: boolean; onSetup: () => void }) {
  return (
    <Panel title="Connect your booking flow">
      <div className="meetBody">
        <CalendarDays aria-hidden="true" />
        <p>Your Cal.com key is connected. Create a private WDC meeting type, then review its calendar and availability before publishing. If one already exists it is linked instead, and nothing new is created.</p>
        <div className="meetActions">
          <button type="button" className="ad__btn" disabled={busy} onClick={onSetup}>{busy ? "Checking setup…" : "Set up now"}</button>
          <a className="ad__btn ad__btn--plain" href="https://app.cal.com/event-types" target="_blank" rel="noopener noreferrer">Open Cal.com</a>
        </div>
      </div>
    </Panel>
  );
}

export function MeetingSettings() {
  const [data, setData] = useState<Setup | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<Tab>("Availability");
  const [busy, setBusy] = useState(false);
  const [ack, setAck] = useState(false);
  const [pending, setPending] = useState<StoredCommand | null>(null);
  const [pendingState, setPendingState] = useState("");
  const [pendingNote, setPendingNote] = useState("");

  /** Reads the setup state. Resolves false (and shows why) when it could not. */
  const load = useCallback(async (): Promise<boolean> => {
    let response: Response;
    try {
      response = await fetch("/api/meetings?view=setup", { signal: AbortSignal.timeout(25_000) });
    } catch (error) {
      setProblem({ ...describeMeetingError(loadFailureCode(error)), retry: "load" });
      return false;
    }
    const value = await response.json().catch(() => null);
    if (!response.ok || !value) {
      const code = isMeetingErrorCode(value?.code) ? value.code : value ? "unknown" : "bad_reply";
      setProblem({ ...describeMeetingError(code), retry: "load" });
      return false;
    }
    setData(value);
    setProblem(null);
    return true;
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => {
      setPending(pendingMeetingCommand());
      return load();
    });
  }, [load]);

  /** A change that is saved but not yet confirmed: remember it so the banner can offer "Check again". */
  function held(error: unknown) {
    if (!(error instanceof MeetingPending)) return false;
    setPending(pendingMeetingCommand());
    setPendingState(error.state);
    setPendingNote(error.message);
    return true;
  }

  async function recheck() {
    setBusy(true);
    try {
      if (await load()) toast("Checked with Cal.com");
    } finally {
      setBusy(false);
    }
  }

  async function setup() {
    setBusy(true);
    setProblem(null);
    try {
      const value = await meetingCommand({ action: "setup" }, setMessage);
      setMessage(value.message);
      toast(value.message);
      await load();
    } catch (error) {
      if (held(error)) toast("Saved, but not confirmed yet", "bad");
      else {
        setProblem(problemFor(error, "setup", "Setup needs attention"));
        toast("Setup needs attention", "bad");
      }
    } finally {
      setBusy(false);
    }
  }

  async function checkPending() {
    setBusy(true);
    try {
      const result = await checkMeetingCommand(setMessage);
      setPending(null);
      setPendingState("");
      toast((result as { message?: string } | undefined)?.message ?? "Updated");
      await load();
    } catch (error) {
      if (held(error)) return;
      setPending(pendingMeetingCommand());
      setProblem(problemFor(error, "load", "The earlier change was not applied"));
    } finally {
      setBusy(false);
    }
  }

  function stopWaiting() {
    clearMeetingCommand();
    setPending(null);
    setPendingState("");
    setMessage("Stopped waiting for the earlier change. Check Cal.com to see whether it was applied, then repeat it if not.");
  }

  async function saveSettings(_previous: ActionState, fd: FormData): Promise<ActionState> {
    try {
      const result = await meetingCommand({
        action: "settings",
        enabled: fd.get("enabled") === "1",
        webhookAck: fd.get("webhookAck") === "1",
        duration: Number(fd.get("duration")),
        notice: Number(fd.get("notice")),
        buffer: Number(fd.get("buffer")),
      }, setMessage);
      await load();
      return { ok: true, message: result.message };
    } catch (error) {
      if (held(error)) return { ok: false, message: "Saved, but Cal.com has not confirmed it yet. Use Check again at the top of the page." };
      return { ok: false, message: error instanceof Error ? error.message : "Settings could not be saved." };
    }
  }

  async function saveAvailability(_previous: ActionState, fd: FormData): Promise<ActionState> {
    try {
      const schedule = JSON.parse(String(fd.get("schedule")));
      const result = await meetingCommand({ action: "availability", schedule }, setMessage);
      await load();
      return { ok: true, message: result.message };
    } catch (error) {
      if (held(error)) return { ok: false, message: "Saved, but Cal.com has not confirmed it yet. Use Check again at the top of the page." };
      return { ok: false, message: error instanceof Error ? error.message : "Availability could not be saved." };
    }
  }

  const goConnections = () => setTab("Connections");
  const tabIndex = TABS.indexOf(tab);

  return (
    <div className="meetWrap meetSettings">
      <div className="ad__head">
        <div>
          <h1>Scheduling settings</h1>
          <p>Your availability and how people book a conversation.</p>
        </div>
        <Link className="ad__btn ad__btn--plain" href="/admin/meetings">View meetings</Link>
      </div>
      {problem ? <ProblemAlert problem={problem} busy={busy} onRetry={() => void (problem.retry === "setup" ? setup() : recheck())} onSetup={() => void setup()} /> : null}
      {pending ? <PendingBanner command={pending} state={pendingState} note={pendingNote} busy={busy} onCheck={() => void checkPending()} onStop={stopWaiting} /> : null}
      {message ? <p role="status" className="meetHint">{message}</p> : null}
      {!data && !problem ? <p className="meetBusy" role="status">Checking scheduling configuration…</p> : null}
      {data ? (
        <>
          {!data.config.event_type_id ? <SetupPanel busy={busy} onSetup={() => void setup()} /> : null}
          <SectionTabs tab={tab} onChange={setTab} />
          <div role="tabpanel" id="meet-panel" aria-labelledby={`meet-tab-${tabIndex}`}>
            {tab === "Availability" ? <AvailabilityTab data={data} busy={busy} onSetup={() => void setup()} onSave={saveAvailability} /> : null}
            {tab === "Booking rules" ? (
              <BookingRulesTab data={data} busy={busy} ack={ack} onAck={setAck} onSetup={() => void setup()} onRecheck={() => void recheck()} goConnections={goConnections} onSave={saveSettings} />
            ) : null}
            {tab === "Reminders" ? <RemindersTab data={data} goConnections={goConnections} /> : null}
            {tab === "Connections" ? <ConnectionsTab data={data} busy={busy} onRecheck={() => void recheck()} /> : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
