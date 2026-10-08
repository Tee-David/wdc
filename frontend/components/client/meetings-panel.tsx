import Link from "next/link";
import { CalendarDays, Video } from "lucide-react";
import { meetingList } from "@/lib/meetings/store";
import { Empty, Panel } from "@/components/admin/bits";

/**
 * MEETINGS, FOR THIS CLIENT: the ones coming up with a join link, and a way to
 * book another. Matched to the client by the email on the booking, so a
 * meeting booked by someone else at the company is not shown. Past ones are
 * kept to what the timeline shows.
 */
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * 86_400_000).toISOString();

export async function upcomingFor(email: string) {
  const all = await meetingList(iso(0), iso(120)).catch(() => []);
  const mail = email.trim().toLowerCase();
  return all.filter((m) => ["accepted", "confirmed"].includes(String(m.status).toLowerCase())
    && (m.attendees ?? []).some((a) => a.email?.trim().toLowerCase() === mail));
}

export async function MeetingsPanel({ email }: { email: string }) {
  const meetings = await upcomingFor(email);
  const fmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" });
  return (
    <Panel title="Meetings" action={<Link href="/meet">Book a call</Link>}>
      {meetings.length ? (
        <ul className="adDash__list">
          {meetings.slice(0, 4).map((m) => (
            <li key={m.uid}>
              <b>{m.title}</b>
              <small>{fmt.format(new Date(m.start))} (Lagos time)</small>
              {m.meetingUrl ? <a className="ad__btn" href={m.meetingUrl} target="_blank" rel="noopener noreferrer"><Video aria-hidden="true" /> Join the call</a> : null}
            </li>
          ))}
        </ul>
      ) : (
        <Empty title="No call booked" icon={CalendarDays} action={<Link className="ad__btn ad__btn--primary" href="/meet">Book a call</Link>}>
          Pick a time that suits you. The joining link appears here once it is booked.
        </Empty>
      )}
    </Panel>
  );
}
