"use client";

import { Panel } from "@/components/admin/bits";
import { Actions, Checks, Fields, Form, Submit } from "@/components/admin/form";
import { saveWorkingWeek } from "@/lib/workspace/notifications-actions";

const DAYS = [["1", "Monday"], ["2", "Tuesday"], ["3", "Wednesday"], ["4", "Thursday"], ["5", "Friday"], ["6", "Saturday"], ["7", "Sunday"]];

/** The days you work. The morning email skips the others. `null` means migration 0061 is not applied. */
export function WorkingWeek({ days }: { days: string | null }) {
  return (
    <Panel title="Your working week">
      {days === null ? <p role="alert">Your working week needs a database update (migration 0061). Admin applies it in Settings, System.</p> : (
        <Form action={saveWorkingWeek}>
          <Fields>
            <Checks name="days" label="Days you work" options={DAYS.map(([value, label]) => ({ value, label }))} defaultValue={days.split(",")} hint="Your morning email of tasks and handovers only goes out on these days." />
          </Fields>
          <Actions><Submit>Save working week</Submit></Actions>
        </Form>
      )}
    </Panel>
  );
}
