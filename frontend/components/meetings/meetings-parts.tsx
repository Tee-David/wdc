"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Copy, RefreshCw, Settings } from "lucide-react";
import { Dialog } from "@/components/admin/dialog";
import { DateTimeInput } from "@/components/admin/pick";
import { ask } from "@/components/admin/confirm";
import { toast } from "@/components/admin/toast";
import { RowMenu, type RowMenuItem } from "@/components/admin/row-menu";
import { BulkBar } from "@/components/admin/bulk";
import { dateTimeWords } from "@/lib/admin/when";
import { meetingCommand } from "./client";
import { safeJoinUrl } from "./links";
import type { Booking } from "@/lib/meetings/cal";
import "./meetings.css";

const status = (b: Booking) => b.status.toLowerCase();
const localInput = (value: string) => { const d = new Date(value); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };

/**
 * The meeting sheet. The list on the page is server rendered and every row links to `?open=<uid>`; this reads that
 * address, shows the booking in a sheet and runs the same commands the page always had (approve, decline, reschedule,
 * cancel), each confirmed first and each saved by the server before it is reported. Closing removes `open` again.
 */
export function MeetingSheet({ meetings }: { meetings: Booking[] }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const uid = params.get("open");
  const found = uid ? meetings.find((b) => b.uid === uid) ?? null : null;
  /* A command returns the fresh booking; until the page reloads it replaces the one in props. */
  const [fresh, setFresh] = useState<Booking | null>(null);
  const selected = found ? (fresh?.uid === found.uid ? fresh : found) : null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [rescheduling, setRescheduling] = useState(false);

  const close = () => {
    if (busy) return;
    const p = new URLSearchParams(params.toString());
    p.delete("open");
    setRescheduling(false); setError(""); setNotice(""); setFresh(null);
    router.replace(`${path}${p.size ? `?${p}` : ""}`, { scroll: false });
  };

  async function change(action: string, start?: string) {
    if (!selected) return;
    const word = action[0].toUpperCase() + action.slice(1);
    const ok = await ask(`${action === "confirm" ? "Approve" : word} this meeting? Cal.com manages the calendar change notice. ${action === "cancel" || action === "decline" ? "This change cannot be undone." : ""}`, { verb: action === "confirm" ? "Approve request" : action === "cancel" ? "Cancel meeting" : word });
    if (!ok) return;
    setBusy(true); setError("");
    try {
      const result = await meetingCommand({ action, uid: selected.uid, start, reason: "Updated by the studio" }, setNotice);
      setFresh(result.booking); setNotice(result.notices ?? "");
      toast("Meeting updated");
      setRescheduling(false);
      router.refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : "The meeting could not be updated.";
      setError(message); toast(message, "bad");
    } finally { setBusy(false); }
  }

  const join = selected ? safeJoinUrl(selected.meetingUrl) : null;
  const live = selected ? !["cancelled", "rejected"].includes(status(selected)) : false;
  return (
    <Dialog open={!!selected} onClose={close} title="Meeting details">
      {selected ? (
        <div className="meetSheet">
          <h3>{selected.title}</h3>
          <p>{dateTimeWords(selected.start)} for {Math.max(0, Math.round((Date.parse(selected.end) - Date.parse(selected.start)) / 60_000))} minutes. <small className="meetHint">Studio time, one hour ahead of UTC.</small></p>
          <p><span className={`ad__pill ad__pill--${status(selected) === "pending" ? "warn" : !live ? "flat" : "good"}`}>{status(selected) === "pending" ? "Awaiting confirmation" : selected.status}</span></p>
          {selected.attendees?.length ? <ul className="meetSheet__who">{selected.attendees.map((a, i) => <li key={i}><b>{a.name}</b><small>{a.email}</small></li>)}</ul> : null}
          {join ? <p><a className="ad__btn" target="_blank" rel="noopener noreferrer" href={join}>Join meeting</a></p> : <p className="meetHint">The meeting link has not been supplied by the provider yet.</p>}
          {notice ? <p role="status" className="meetHint">{notice}</p> : null}
          {error ? <p role="alert" className="meetError">{error}</p> : null}
          {rescheduling ? (
            <form onSubmit={(e) => { e.preventDefault(); const start = new FormData(e.currentTarget).get("start"); if (typeof start === "string") void change("reschedule", new Date(start).toISOString()); }}>
              <label className="meetField">New date and time<DateTimeInput name="start" defaultValue={localInput(selected.start)} min={localInput(new Date().toISOString())} /></label>
              <p className="meetHint">Cal.com checks availability before changing the meeting. Times here use your browser&rsquo;s time zone.</p>
              <div className="meetActions"><button className="ad__btn ad__btn--primary" disabled={busy}>Confirm new time</button><button type="button" className="ad__btn" disabled={busy} onClick={() => setRescheduling(false)}>Keep the time</button></div>
            </form>
          ) : (
            <div className="meetActions">
              {status(selected) === "pending" ? <><button className="ad__btn ad__btn--primary" disabled={busy} onClick={() => void change("confirm")}>Approve request</button><button className="ad__btn" disabled={busy} onClick={() => void change("decline")}>Decline request</button></> : null}
              {Date.parse(selected.end) > new Date().getTime() && live ? <><button className="ad__btn" disabled={busy} onClick={() => setRescheduling(true)}>Reschedule</button><button className="ad__btn" disabled={busy} onClick={() => void change("cancel")}>Cancel meeting</button></> : null}
            </div>
          )}
          <p className="meetHint">Optional reminders are off. Calendar confirmations and changes are managed by Cal.com; enabled does not mean delivered.</p>
        </div>
      ) : null}
    </Dialog>
  );
}

/** The bulk bar for the table: approve requests or cancel meetings, one command at a time. */
export function MeetingsBulk({ target, labels }: { target: string; labels: Record<string, string> }) {
  const [, setNote] = useState("");
  async function bulk(kind: string, ids: string[]) {
    const outcomes = [];
    for (const uid of ids) {
      try { await meetingCommand({ action: kind, uid, reason: "Updated by the studio in bulk" }, setNote); outcomes.push({ id: uid, label: labels[uid] || uid, ok: true, message: "Updated" }); }
      catch (e) { outcomes.push({ id: uid, label: labels[uid] || uid, ok: false, message: e instanceof Error ? e.message : "Check Cal.com before continuing." }); }
    }
    const done = outcomes.filter((row) => row.ok).length;
    return { ok: done === ids.length, message: `${done} of ${ids.length} meetings updated.`, outcomes };
  }
  return (
    <BulkBar target={target} noun="meetings" onRun={bulk}
      actions={[{ kind: "confirm", label: "Approve", icon: "check", confirm: "Approve the selected meeting requests?" }]}
      more={[{ kind: "cancel", label: "Cancel meetings", danger: true, confirm: "Cancel the selected meetings? Cal.com manages the calendar change notices. This cancellation cannot be undone." }]} />
  );
}

/** The ⋮ in the Meetings head. */
export function MeetingsChores({ owner }: { owner: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function sync() {
    setBusy(true);
    try { const result = await meetingCommand({ action: "sync" }, () => {}); toast(result.message); router.refresh(); }
    catch (e) { toast(e instanceof Error ? e.message : "Refresh failed.", "bad"); }
    finally { setBusy(false); }
  }
  const items: RowMenuItem[] = [
    { kind: "dialog", label: "Refresh from Cal.com", title: "Refresh meetings", icon: RefreshCw, render: (close) => (
      <><p>Refresh persisted bookings from the scheduling provider. The result appears after the read is checked.</p><button className="ad__btn ad__btn--primary" disabled={busy} onClick={() => { close(); void sync(); }}>Refresh meetings</button></>
    ) },
    { kind: "dialog", label: "Copy the booking link", title: "Booking link", icon: Copy, render: (close) => (
      <><p>Anyone with this link can ask for a time.</p><button className="ad__btn ad__btn--primary" onClick={() => { void navigator.clipboard.writeText(`${location.origin}/meet`).then(() => toast("Booking link copied")).catch(() => toast("Copy could not be completed. Use the booking page link.", "bad")); close(); }}>Copy the link</button></>
    ) },
    ...(owner ? [{ kind: "link" as const, label: "Scheduling settings", href: "/admin/settings/meetings", icon: Settings }] : []),
  ];
  return <RowMenu items={items} label="meetings, more" />;
}
