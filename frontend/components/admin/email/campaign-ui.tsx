"use client";

import { useEffect, useRef, useState } from "react";
import { Ban, Pause, Play, RotateCw, Send, Tag, Users } from "lucide-react";
import {
  campaignStateAction, copyUnopenedAction, countAudience, newCampaignAction, retryFailedAction, saveAudienceAction, sendCampaignAction, tagClickersAction,
} from "@/lib/admin/campaign-actions";
import { Actions, Checks, Field, Fields, Form, Hidden, Select, Submit } from "../form";
import { DialogButton } from "../dialog";
import "./campaigns.css";

export function NewCampaign() {
  return (
    <DialogButton label="New campaign" title="New campaign" icon={Send}>
      {() => (
        <Form action={newCampaignAction}>
          <Fields><Field name="title" label="Title" required placeholder="October notes" hint="It is also the first subject line. You can change both." /></Fields>
          <Actions><Submit icon={Send}>Start</Submit></Actions>
        </Form>
      )}
    </DialogButton>
  );
}

/** Who gets it and how it is tracked, with a count that follows the ticks: the people who would get it if it went now. */
export function AudienceForm({ id, title, tags, audience, track, reach }: {
  id: string; title: string; tags: { tag: string; n: number }[];
  audience: { tags: string[]; types: string[]; excludeTags: string[] }; track: string; reach: number;
}) {
  const [count, setCount] = useState<number | null>(reach);
  const box = useRef<HTMLDivElement>(null);
  const timer = useRef(0);
  const run = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  /* A change anywhere in the ticks recounts, a moment after the last one, and an older answer never lands over a newer one. */
  const recount = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      const read = (n: string) => [...(box.current?.querySelectorAll<HTMLInputElement>(`input[name="${n}"]:checked`) ?? [])].map((i) => i.value);
      const mine = ++run.current;
      const n = await countAudience(read("tags"), read("types"), read("exclude")).catch(() => null);
      if (mine === run.current) setCount(n);
    }, 250);
  };
  return (
    <Form action={saveAudienceAction}>
      <Hidden name="id" value={id} />
      <div ref={box} onChange={recount} className="adCp__pad" style={{ padding: 0 }}>
        <Fields>
          <Field name="title" label="Title" defaultValue={title} />
          <Checks name="types" label="Send to" defaultValue={audience.types} options={[{ value: "client", label: "Clients" }, { value: "lead", label: "Leads" }, { value: "subscriber", label: "Subscribers" }]}
            hint="Only people marked as having asked to hear from us, and never anyone who unsubscribed or bounced. Leave all unticked for everyone who asked." />
          {tags.length ? <Checks name="tags" label="Only with these tags" defaultValue={audience.tags} options={tags.map((t) => ({ value: t.tag, label: `${t.tag} (${t.n})` }))} /> : null}
          {tags.length ? <Checks name="exclude" label="Leave out these tags" defaultValue={audience.excludeTags} options={tags.map((t) => ({ value: t.tag, label: t.tag }))} /> : null}
        </Fields>
        <div className="adCp__box" role="status" aria-live="polite">
          <span className="adCp__ic" aria-hidden="true"><Users /></span>
          <div>
            <b>{count === null ? "–" : count.toLocaleString("en-NG")}</b> <span>{count === 1 ? "person" : "people"} will get it</span>
            <small>Anyone who unsubscribed or bounced is left out, checked again at the moment of sending.</small>
          </div>
        </div>
        <Fields>
          <Select name="track" label="Tracking" defaultValue={track} options={[
            { value: "full", label: "Clicks and opens, per person" }, { value: "anonymous", label: "Counts only, no names" }, { value: "off", label: "None" },
          ]} hint="Opens are approximate: mail apps load images before anyone reads. A click counts as an open." />
        </Fields>
      </div>
      <Actions><Submit>Save who gets it</Submit></Actions>
    </Form>
  );
}

/** Send now, or at a set time. The date and time are the site's own calendar; the answer is asked once more before it goes. */
export function SendForm({ id, recipients, scheduled }: { id: string; recipients: number; scheduled?: boolean }) {
  const [when, setWhen] = useState<"now" | "later">(scheduled ? "later" : "now");
  const people = recipients ? `${recipients.toLocaleString("en-NG")} people` : "everyone it reaches";
  return (
    <Form action={sendCampaignAction} confirm={when === "later" ? `Schedule this campaign for ${people}? You can still cancel it before it goes out.` : `Send this campaign to ${people}? Once it starts, it cannot be recalled, only paused.`}>
      <Hidden name="id" value={id} />
      <div className="adCp__pad" style={{ padding: 0 }}>
        <div>
          <p className="adCp__lbl">When</p>
          <div className="adCp__seg" role="group" aria-label="When to send">
            <button type="button" aria-pressed={when === "now"} onClick={() => setWhen("now")}>Send now</button>
            <button type="button" aria-pressed={when === "later"} onClick={() => setWhen("later")}>Schedule</button>
          </div>
        </div>
        {when === "later" ? <Fields><Field name="at" label="Send on" type="datetime-local" hint="Lagos time. It goes out in small batches, so the last person may get it a few minutes after the first." /></Fields> : null}
      </div>
      <Actions><Submit icon={Send}>{when === "later" ? "Schedule" : "Send now"}</Submit></Actions>
    </Form>
  );
}

export function StateButtons({ id, status }: { id: string; status: string }) {
  const btn = (to: string, label: string, Icon: typeof Pause, tone: "plain" | "danger" = "plain", confirm?: string) => (
    <Form action={campaignStateAction} confirm={confirm}>
      <Hidden name="id" value={id} /><Hidden name="to" value={to} /><Submit tone={tone} icon={Icon}>{label}</Submit>
    </Form>
  );
  return (
    <span className="ad__row" style={{ flexWrap: "wrap" }}>
      {status === "sending" ? btn("paused", "Pause", Pause) : null}
      {status === "paused" ? btn("sending", "Resume", Play) : null}
      {["scheduled", "sending", "paused"].includes(status) ? btn("cancelled", "Cancel", Ban, "danger", "Cancel this campaign? Nobody who has not got it yet will. This cannot be undone.") : null}
    </span>
  );
}

export function AfterButtons({ id, failed }: { id: string; failed: number }) {
  return (
    <span className="adCp__acts">
      {failed ? <Form action={retryFailedAction}><Hidden name="id" value={id} /><Submit tone="plain" icon={RotateCw}>Try the {failed} failed again</Submit></Form> : null}
      <Form action={copyUnopenedAction}><Hidden name="id" value={id} /><Submit tone="plain" icon={Send}>Copy to people who did not open it</Submit></Form>
    </span>
  );
}

/** One press tags everyone who clicked. The tag is suggested from the title and can be changed. */
export function TagClickers({ id, people, suggested }: { id: string; people: number; suggested: string }) {
  return (
    <div className="adCp__box adCp__box--form">
      <span className="adCp__ic" aria-hidden="true"><Tag /></span>
      <Form action={tagClickersAction}>
        <Hidden name="id" value={id} />
        <Fields><Field name="tag" label="Tag everyone who clicked" defaultValue={suggested} hint={`${people.toLocaleString("en-NG")} ${people === 1 ? "person gets" : "people get"} this tag.`} /></Fields>
        <Actions><Submit icon={Tag}>Tag them</Submit></Actions>
      </Form>
    </div>
  );
}
