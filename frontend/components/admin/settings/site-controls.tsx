"use client";

import { useState } from "react";
import { Construction, Copy, EyeOff, Save } from "lucide-react";
import { saveSiteDescription, setMaintenance, setSiteNoindex } from "@/lib/admin/site-actions";
import { Actions, Area, Field, Fields, Form, Hidden, Submit } from "@/components/admin/form";

export function DescriptionForm({ value, custom, min, max }: { value: string; custom: boolean; min: number; max: number }) {
  return (
    <Form action={saveSiteDescription}>
      <Fields>
        <Area name="description" label="Default description" defaultValue={value} rows={3} required
          hint={`What a search result shows under the title, for any page without its own. ${min} to ${max} characters.`} />
      </Fields>
      <Actions>
        <Submit icon={Save}>Save description</Submit>
        {custom ? <button className="ad__btn" type="submit" name="reset" value="1">Reset to default</button> : null}
      </Actions>
    </Form>
  );
}

export function NoindexForm({ on, host }: { on: boolean; host: string }) {
  if (on) {
    return (
      <Form action={setSiteNoindex}>
        <Hidden name="on" value="0" />
        <Actions><Submit>Let search engines index the site</Submit></Actions>
      </Form>
    );
  }
  return (
    <Form action={setSiteNoindex}>
      <Hidden name="on" value="1" />
      <Fields>
        <Field name="confirm" label={`Type ${host} to confirm`} required hint="Left on, this quietly takes the studio out of search results." />
      </Fields>
      <Actions><Submit tone="danger" icon={EyeOff}>Ask search engines not to index</Submit></Actions>
    </Form>
  );
}

export function MaintenanceForm({ on, host }: { on: boolean; host: string }) {
  if (on) {
    return (
      <Form action={setMaintenance}>
        <Hidden name="on" value="0" />
        <Actions><Submit>Bring the site back</Submit></Actions>
      </Form>
    );
  }
  return (
    <Form action={setMaintenance}>
      <Hidden name="on" value="1" />
      <Fields>
        <Area name="message" label="What visitors are told" rows={2} hint="Optional. Up to 300 characters. Without it: we are making some changes and will be back shortly." />
        <Field name="backBy" label="Back by (Lagos time)" type="datetime-local" half hint="Optional. Tells visitors, and search engines when to try again." />
        <Field name="confirm" label={`Type ${host} to confirm`} half required />
      </Fields>
      <Actions><Submit tone="danger" icon={Construction}>Put the site in maintenance</Submit></Actions>
    </Form>
  );
}

/** The reviewer link, with a copy button. It stops working when maintenance ends. */
export function ReviewerLink({ url }: { url: string }) {
  const [said, setSaid] = useState("");
  return (
    <span className="ad__row" style={{ minWidth: 0 }}>
      <code style={{ overflowWrap: "anywhere", minWidth: 0 }}>{url}</code>
      <button type="button" className="ad__btn" onClick={async () => {
        try { await navigator.clipboard.writeText(url); setSaid("Copied."); } catch { setSaid("Select the link and copy it."); }
      }}><Copy aria-hidden="true" /> Copy link</button>
      <span role="status" className="ad__dim">{said}</span>
    </span>
  );
}
