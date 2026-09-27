"use client";

import { saveBusinessSettings } from "@/lib/admin/settings-actions";
import { Panel } from "@/components/admin/bits";
import { Fields } from "@/components/admin/form";
import { NETWORKS, socialKey } from "@/lib/social";
import { SettingsForm, Text } from "./kit";

/** Settings, Business profile: the studio's social profiles. */
export function BusinessForm({ values }: { values: Record<string, string> }) {
  return (
    <SettingsForm action={saveBusinessSettings}>
      <Panel title="Social profiles">
        <div className="adSetPad">
          <p className="ad__dim" style={{ margin: "0 0 .8rem" }}>Each one adds its mark to the footer of every email we send. Leave a network empty and it draws none.</p>
          <Fields>
            {NETWORKS.map((n) => (
              <Text key={n.network} name={socialKey(n.network)} label={n.label} half
                type={n.network === "whatsapp" ? "text" : "url"} inputMode={n.network === "whatsapp" ? "tel" : undefined}
                defaultValue={values[socialKey(n.network)] ?? ""} placeholder={n.example}
                message={`An address like ${n.example}`} />
            ))}
          </Fields>
        </div>
      </Panel>
    </SettingsForm>
  );
}
