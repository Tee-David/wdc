"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { saveSiteDescription, setMaintenance, setSiteNoindex } from "@/lib/admin/site-actions";
import { Panel } from "@/components/admin/bits";
import { Field, Fields } from "@/components/admin/form";
import { ConfirmSwitch, SettingsForm, Text } from "./kit";

/** Search engines and maintenance: two switches that change the site for everybody, so each asks first. */
export function Visibility({ indexed, maintenance, host, reviewer }: {
  indexed: boolean; maintenance: boolean; host: string; reviewer: string | null;
}) {
  return (
    <Panel title="Visibility">
      <ConfirmSwitch label="Show in search engines" note={indexed ? "Every public page may be listed." : "Search engines are asked not to list the site."}
        on={indexed} post={indexed ? "1" : "0"} action={setSiteNoindex}
        ask={indexed ? "Hide the whole site from search engines?" : "Let search engines list the site again?"}
        confirmLabel={indexed ? "Hide from search" : "Show in search"} danger={indexed}>
        {indexed ? <Fields><Field name="confirm" label={`Type ${host} to confirm`} required /></Fields> : null}
      </ConfirmSwitch>
      <ConfirmSwitch label="Maintenance mode" note={maintenance ? "Visitors see a holding page. The admin, payments and invoices still work." : "Visitors see a “back soon” page."}
        on={maintenance} post={maintenance ? "0" : "1"} action={setMaintenance}
        ask={maintenance ? "Bring the site back for everybody?" : "Put the public site into maintenance?"}
        confirmLabel={maintenance ? "Bring it back" : "Turn on"} danger={!maintenance}>
        {!maintenance ? (
          <Fields>
            <Field name="message" label="What visitors are told" placeholder="We are making some changes and will be back shortly." />
            <Field name="backBy" label="Back by (Lagos time)" type="datetime-local" half />
            <Field name="confirm" label={`Type ${host} to confirm`} half required />
          </Fields>
        ) : null}
      </ConfirmSwitch>
      {maintenance && reviewer ? <ReviewerLink url={reviewer} /> : null}
    </Panel>
  );
}

/** The site's default description, counted, with the search result it makes. */
export function DescriptionForm({ host, title, value, custom, min, max }: { host: string; title: string; value: string; custom: boolean; min: number; max: number }) {
  const [text, setText] = useState(value);
  return (
    <SettingsForm action={saveSiteDescription}>
      <Panel title="Search result" action={custom ? <button className="ad__btn" type="submit" name="useDefault" value="1">Use the default</button> : null}>
        <div className="adSetPad" onInput={(e) => { const t = e.target as HTMLTextAreaElement; if (t.name === "description") setText(t.value); }}>
          <Text name="description" label="Description" rows={3} required count={max} defaultValue={value}
            pattern={`.{${min},${max}}`} message={`Between ${min} and ${max} characters, so a search result shows all of it.`} />
          <div className="ad__f">
            <span className="ad__fl">Preview</span>
            <div className="adSerp" aria-label="How a Google result looks">
              <small>{host}</small>
              <b>{title}</b>
              <span>{text}</span>
            </div>
          </div>
        </div>
      </Panel>
    </SettingsForm>
  );
}

/** The reviewer link, with a copy button. It stops working when maintenance ends. */
export function ReviewerLink({ url }: { url: string }) {
  const [said, setSaid] = useState("");
  return (
    <div className="adSetPad adSet__days">
      <span className="ad__fl">Preview link for reviewers</span>
      <span className="adSet__link">
        <code>{url}</code>
        <button type="button" className="ad__btn" onClick={async () => {
          try { await navigator.clipboard.writeText(url); setSaid("Copied."); } catch { setSaid("Select the link and copy it."); }
        }}><Copy aria-hidden="true" /> Copy</button>
      </span>
      <span role="status" className="ad__dim">{said}</span>
    </div>
  );
}
