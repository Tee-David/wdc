"use client";

import { SlidersHorizontal, Save } from "lucide-react";
import { saveDashboardPanels } from "@/lib/admin/dashboard-prefs";
import { HIDEABLE } from "@/lib/admin/dashboard-panels";
import { Actions, Checks, Fields, Form, Submit } from "./form";
import { DialogButton } from "./dialog";

/** Choose which panels the dashboard shows. Saved to the account, so it follows the person to any device. */
export function CustomiseDashboard({ hidden }: { hidden: string[] }) {
  return (
    <DialogButton label="Customise" title="What the dashboard shows" icon={SlidersHorizontal} tone="plain">
      {(close) => (
        <Form action={saveDashboardPanels} onDone={close}>
          <Fields>
            <Checks name="show" label="Panels" long hint="Untick what you do not need. You can bring them back here."
              options={HIDEABLE.map(([value, label]) => ({ value, label }))}
              defaultValue={HIDEABLE.map(([id]) => id).filter((id) => !hidden.includes(id))} />
          </Fields>
          <Actions><Submit icon={Save}>Save</Submit></Actions>
        </Form>
      )}
    </DialogButton>
  );
}
