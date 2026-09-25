"use client";

import { EyeOff, Save } from "lucide-react";
import { saveSiteDescription, setSiteNoindex } from "@/lib/admin/site-actions";
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
