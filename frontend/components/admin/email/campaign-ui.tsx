"use client";

import { useState } from "react";
import { Ban, Pause, Play, RotateCw, Send, Tag, Users } from "lucide-react";
import {
  campaignStateAction, copyUnopenedAction, countAudience, newCampaignAction, retryFailedAction, saveAudienceAction, sendCampaignAction, tagClickersAction,
} from "@/lib/admin/campaign-actions";
import { Actions, Checks, Field, Fields, Form, Hidden, Select, Submit } from "../form";
import { DialogButton } from "../dialog";

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

/** Who gets it, how it is tracked, and the live count. */
export function AudienceForm({ id, title, tags, audience, track }: {
  id: string; title: string; tags: { tag: string; n: number }[];
  audience: { tags: string[]; types: string[]; excludeTags: string[] }; track: string;
}) {
  const [count, setCount] = useState<number | null>(null);
  return (
    <Form action={saveAudienceAction}>
      <Hidden name="id" value={id} />
      <Fields>
        <Field name="title" label="Title" defaultValue={title} />
        <Checks name="types" label="Send to" defaultValue={audience.types} options={[{ value: "client", label: "Clients" }, { value: "lead", label: "Leads" }, { value: "subscriber", label: "Subscribers" }]}
          hint="Only people marked as having asked to hear from us, and never anyone who unsubscribed or bounced. Leave all unticked for everyone who asked." />
        {tags.length ? <Checks name="tags" label="Only with these tags" defaultValue={audience.tags} options={tags.map((t) => ({ value: t.tag, label: `${t.tag} (${t.n})` }))} /> : null}
        {tags.length ? <Checks name="exclude" label="Leave out these tags" defaultValue={audience.excludeTags} options={tags.map((t) => ({ value: t.tag, label: t.tag }))} /> : null}
        <Select name="track" label="Tracking" defaultValue={track} options={[
          { value: "full", label: "Clicks and opens, per person" }, { value: "anonymous", label: "Counts only, no names" }, { value: "off", label: "None" },
        ]} hint="Opens are approximate: mail apps load images before anyone reads. A click counts as an open." />
      </Fields>
      <Actions>
        <Submit>Save who gets it</Submit>
        <button type="button" className="ad__btn" onClick={async (e) => {
          const form = e.currentTarget.closest("form");
          const read = (n: string) => form ? [...form.querySelectorAll<HTMLInputElement>(`input[name="${n}"]:checked`)].map((i) => i.value) : [];
          setCount(await countAudience(read("tags"), read("types"), read("exclude")).catch(() => null));
        }}><Users aria-hidden="true" /> Count them</button>
        {count !== null ? <span role="status" className="ad__dim">{count} {count === 1 ? "person" : "people"} right now</span> : null}
      </Actions>
    </Form>
  );
}

export function SendForm({ id, recipients }: { id: string; recipients: number }) {
  return (
    <Form action={sendCampaignAction} confirm={`Send this campaign to ${recipients || "everyone it reaches"} people? Once it starts, it cannot be recalled, only paused.`}>
      <Hidden name="id" value={id} />
      <Fields><Field name="at" label="Send at (leave empty to send now)" type="datetime-local" hint="Lagos time. It goes out in small batches, so the last person may get it a few minutes after the first." /></Fields>
      <Actions><Submit icon={Send}>Send</Submit></Actions>
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
    <span className="ad__row" style={{ flexWrap: "wrap" }}>
      {failed ? <Form action={retryFailedAction}><Hidden name="id" value={id} /><Submit tone="plain" icon={RotateCw}>Try the {failed} failed again</Submit></Form> : null}
      <Form action={copyUnopenedAction}><Hidden name="id" value={id} /><Submit tone="plain" icon={Send}>Copy to people who did not open it</Submit></Form>
      <DialogButton label="Tag people who clicked" title="Tag people who clicked" icon={Tag} tone="plain">
        {(close) => (
          <Form action={tagClickersAction} onDone={close}>
            <Hidden name="id" value={id} />
            <Fields><Field name="tag" label="Tag" placeholder="interested-in-web" /></Fields>
            <Actions><Submit>Tag them</Submit></Actions>
          </Form>
        )}
      </DialogButton>
    </span>
  );
}
