"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Images, Undo2 } from "lucide-react";
import { saveSiteDescription, saveSiteSocialImage, setMaintenance, setSiteNoindex } from "@/lib/admin/site-actions";
import { Panel } from "@/components/admin/bits";
import { Field, Fields, useFieldError } from "@/components/admin/form";
import { MediaPicker } from "@/components/admin/media-picker";
import { ConfirmSwitch, SettingsForm, Text, useDirtyPing } from "./kit";

/** Search engines: a switch that changes the site for everybody, so it asks first. */
export function Visibility({ indexed, host }: { indexed: boolean; host: string }) {
  return (
    <Panel title="Visibility">
      <ConfirmSwitch label="Show in search engines" note={indexed ? "Every public page may be listed." : "Search engines are asked not to list the site."}
        on={indexed} post={indexed ? "1" : "0"} action={setSiteNoindex}
        ask={indexed ? "Hide the whole site from search engines?" : "Let search engines list the site again?"}
        confirmLabel={indexed ? "Hide from search" : "Show in search"} danger={indexed}>
        {indexed ? <Fields><Field name="confirm" label={`Type ${host} to confirm`} required /></Fields> : null}
      </ConfirmSwitch>
    </Panel>
  );
}

/** Maintenance on or off. Turning it on takes the public site down, so it asks, and needs the address typed. */
export function MaintenanceSwitch({ maintenance, host, reviewer }: { maintenance: boolean; host: string; reviewer: string | null }) {
  return (
    <Panel title="Status">
      <ConfirmSwitch label="Maintenance mode" note={maintenance ? "Visitors see the holding page below. The admin, payments and invoices still work." : "Visitors see the site as normal."}
        on={maintenance} post={maintenance ? "0" : "1"} action={setMaintenance}
        ask={maintenance ? "Bring the site back for everybody?" : "Put the public site into maintenance?"}
        confirmLabel={maintenance ? "Bring it back" : "Turn on"} danger={!maintenance}>
        {!maintenance ? (
          <Fields>
            <Field name="message" label="What visitors are told" placeholder="We are making a few changes to the site." />
            <Field name="backBy" label="Back by (studio time, UTC+1)" type="datetime-local" half hint="Optional. At this time the site opens again by itself, and anyone waiting on the page sees it come back." />
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

/**
 * The link preview for pages without a card of their own: a picture from the
 * media library, or the drawn mark. Saved with the bar like everything else;
 * Discard puts the one that loaded back.
 */
export function SocialImageForm({ value, host }: { value: string; host: string }) {
  return (
    <SettingsForm action={saveSiteSocialImage}>
      <Panel title="Link preview">
        <SocialImageField value={value} host={host} />
      </Panel>
    </SettingsForm>
  );
}

function SocialImageField({ value, host }: { value: string; host: string }) {
  const [src, setSrc] = useState(value);
  const [open, setOpen] = useState(false);
  const ping = useDirtyPing();
  const box = useRef<HTMLDivElement>(null);
  const err = useFieldError("socialImage");
  useEffect(() => {
    const form = box.current?.closest("form");
    if (!form) return;
    const back = () => setSrc(value);
    form.addEventListener("reset", back);
    return () => form.removeEventListener("reset", back);
  }, [value]);
  const set = (next: string) => { setSrc(next); ping(); };
  return (
    <div ref={box} className="adSetPad adOg">
      <input type="hidden" name="socialImage" value={src} />
      <p className="ad__dim" style={{ margin: 0 }}>
        What a link to the homepage, About or a tool shows in a chat or a post. Pages with a card of their own (services, work, the blog) keep theirs.
      </p>
      <div className="adOg__card" aria-label="How a shared link looks">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- a library picture at its own address
          <img src={src} alt="The picture a shared link shows" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- the drawn mark, as the card draws it
          <span className="adOg__mark"><img src="/brand/icon-color.svg" alt="The drawn mark a shared link shows" /></span>
        )}
        <small>{host}</small>
      </div>
      {err ? <small className="ad__fe" role="alert">{err}</small> : null}
      <div className="ad__row">
        <button type="button" className="ad__btn" onClick={() => setOpen(true)}><Images aria-hidden="true" /> Choose from library</button>
        {src ? <button type="button" className="ad__btn" onClick={() => set("")}><Undo2 aria-hidden="true" /> Use the drawn mark</button> : null}
      </div>
      <small className="ad__dim">1200 by 630 works best; it is cropped to fill that shape. JPEG or PNG: link previews cannot use WebP.</small>
      <MediaPicker open={open} onClose={() => setOpen(false)} kind="image" title="Choose the link preview picture"
        onPick={(p) => { set(p.url); setOpen(false); }} />
    </div>
  );
}
