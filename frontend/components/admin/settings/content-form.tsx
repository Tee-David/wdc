"use client";

import { saveContentSettings } from "@/lib/admin/settings-actions";
import { Panel } from "@/components/admin/bits";
import { Fields, Select } from "@/components/admin/form";
import { SettingsForm, Text } from "./kit";

/** Settings, Blog and site copy: the two blog defaults something reads. */
export function ContentForm({ topic, rssCount, services }: {
  topic: string; rssCount: number; services: { value: string; label: string }[];
}) {
  return (
    <SettingsForm action={saveContentSettings}>
      <Panel title="Blog defaults">
        <div className="adSetPad">
          <Fields>
            <Select name="blog.defaultTopic" label="New posts start as" half defaultValue={topic}
              options={[{ value: "", label: "No service: pick one each time" }, ...services]} />
            <Text name="blog.rssCount" label="Posts in the RSS feed" half inputMode="numeric" required
              pattern="\d{1,3}" defaultValue={String(rssCount)} suffix="newest"
              hint="From 5 to 100. Feed readers only look at the top." message="A whole number from 5 to 100." />
          </Fields>
        </div>
      </Panel>
    </SettingsForm>
  );
}
