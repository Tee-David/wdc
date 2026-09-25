"use client";

import { Send, Save } from "lucide-react";
import { resetFormSettingsAction, saveFormSettingsAction, testFormEmailAction } from "@/lib/forms/settings-actions";
import type { FormSettings, NotificationDef } from "@/lib/forms/settings";
import { TRASH_DAYS } from "@/lib/forms/settings";
import { Actions, Area, Checks, Field, Fields, Form, Hidden, Radios, Select, Submit } from "@/components/admin/form";

/**
 * One form's settings, as cards on one page (Fluent Forms' "Form Settings").
 *
 * A scaffold on the admin's form kit, to be restyled with the dashboard
 * redesign. Everything here is checked again by the server.
 */
export function FormSettingsEditor({ formKey, title, settings, notifications, isOnboarding, previews = {} }: {
  formKey: string;
  /** Each email rendered for the latest real entry, or absent when there is none yet. */
  previews?: Record<string, { to: string; subject: string; html: string }>;
  title: string;
  settings: FormSettings;
  notifications: NotificationDef[];
  isOnboarding: boolean;
}) {
  return (
    <div className="ad__stack">
      <Form action={saveFormSettingsAction} className="ad__stack">
        <Hidden name="form" value={formKey} />

        <section className="ad__panel adForms__card">
          <h2 className="adForms__h">Taking entries</h2>
          <Fields>
            <Checks name="open" label="State" long defaultValue={settings.open ? ["on"] : []}
              options={[{ value: "on", label: `The ${title} form takes new entries` }]}
              hint={isOnboarding ? "Closing pauses NEW briefs for this service. A client already part way through can still finish and send theirs." : undefined} />
            <Area name="closedMessage" label="What a visitor sees when it is closed" rows={2} defaultValue={settings.closedMessage} />
            <Field name="opensOn" label="Opens on" type="date" half defaultValue={settings.opensOn} hint="Optional. Lagos time." />
            <Field name="closesOn" label="Closes after" type="date" half defaultValue={settings.closesOn} hint="Optional. The form takes entries until the end of this day." />
            <Field name="limit" label="Entry limit" type="number" half min="1" defaultValue={settings.limit ?? ""} hint="Leave empty for no limit. Spam does not count." />
            <Select name="limitPer" label="Counted" half defaultValue={settings.limitPer}
              options={[{ value: "total", label: "In total" }, { value: "day", label: "Per day" }, { value: "month", label: "Per month" }]} />
            <Area name="limitMessage" label="What a visitor sees when the limit is reached" rows={2} defaultValue={settings.limitMessage} />
          </Fields>
        </section>

        <section className="ad__panel adForms__card">
          <h2 className="adForms__h">After sending</h2>
          <Fields>
            <Radios name="after" label="Then" defaultValue={settings.after} options={[
              { value: "message", label: "Show a message", note: "Empty fields keep the wording written for this form." },
              { value: "redirect", label: "Go to a page on this site", note: "For a thank-you page. Only addresses on this site are allowed." },
            ]} />
            <Field name="afterHeading" label="Heading" defaultValue={settings.afterHeading} placeholder="Thank you" hint="You can use {first_name}." />
            <Area name="afterMessage" label="Message" rows={3} defaultValue={settings.afterMessage} hint="Plain text. You can use {first_name}." />
            <Field name="redirectTo" label="Page" defaultValue={settings.redirectTo} placeholder="/thank-you" />
          </Fields>
        </section>

        <section className="ad__panel adForms__card">
          <h2 className="adForms__h">Emails this form sends</h2>
          <p className="ad__dim adForms__p">The emails are written in the site&apos;s code. Here you can switch each one off, choose where a studio notice goes, copy people in and change the subject. Switched off, the message log still shows it as Skipped.</p>
          {notifications.map((n) => {
            const s = settings.notifications[n.key];
            return (
              <fieldset key={n.key} className="adForms__notif">
                <legend>{n.name}</legend>
                <Fields>
                  <Checks name={`n.${n.key}.enabled`} label="Sending" long defaultValue={s.enabled ? ["on"] : []}
                    options={[{ value: "on", label: "Send this email" }]} />
                  {n.audience === "studio" ? (
                    <>
                      <Field name={`n.${n.key}.to`} label="Send to" defaultValue={s.to.join(", ")} placeholder="The studio inbox" hint="Separate addresses with commas. Empty means the studio inbox." />
                      <Radios name={`n.${n.key}.replyTo`} label="A reply goes to" defaultValue={s.replyTo} options={[
                        { value: "person", label: "The person who filled the form" },
                        { value: "studio", label: "The studio" },
                      ]} />
                    </>
                  ) : null}
                  <Field name={`n.${n.key}.cc`} label="Copy to" half defaultValue={s.cc.join(", ")} />
                  <Field name={`n.${n.key}.bcc`} label="Blind copy to" half defaultValue={s.bcc.join(", ")} />
                  <Field name={`n.${n.key}.subject`} label="Subject" defaultValue={s.subject} placeholder={n.defaultSubject}
                    hint={n.tokens.length ? `Empty keeps "${n.defaultSubject}". You can use ${n.tokens.join(", ")}.` : `Empty keeps "${n.defaultSubject}".`} />
                </Fields>
                {previews[n.key] ? (
                  <details className="adForms__preview">
                    <summary>Preview, for the latest entry</summary>
                    <p className="ad__dim adForms__p">To {previews[n.key].to} · {previews[n.key].subject}</p>
                    {/* Sandboxed with no permissions: the email's HTML is drawn, never run. */}
                    <iframe title={`Preview of ${n.name}`} sandbox="" srcDoc={previews[n.key].html} />
                  </details>
                ) : null}
              </fieldset>
            );
          })}
        </section>

        <section className="ad__panel adForms__card">
          <h2 className="adForms__h">Spam and keeping entries</h2>
          <Fields>
            <Area name="blockedWords" label="Blocked words" rows={3} defaultValue={settings.blockedWords.join("\n")}
              hint="One per line. An entry with one of these is kept in Spam and nobody is emailed about it. The visitor is thanked as usual." />
            <Select name="trashDays" label="Keep entries in Trash for" defaultValue={String(settings.trashDays)}
              options={TRASH_DAYS.map((d) => ({ value: String(d), label: `${d} days` }))}
              hint="Then they are deleted for good." />
          </Fields>
          <p className="ad__dim adForms__p">Always on: a hidden field that only robots fill in, and a limit on how often one address can send.</p>
        </section>

        <Actions><Submit icon={Save}>Save settings</Submit></Actions>
      </Form>

      <section className="ad__panel adForms__card">
        <h2 className="adForms__h">Send a test</h2>
        <p className="ad__dim adForms__p">Sends to your own address through the real mail server, with the saved copies, and says how long it took. Save first if you changed anything.</p>
        <div className="ad__stack">
          {notifications.map((n) => (
            <Form key={n.key} action={testFormEmailAction} className="ad__row">
              <Hidden name="form" value={formKey} />
              <Hidden name="notification" value={n.key} />
              <Submit icon={Send}>{`Test "${n.name}"`}</Submit>
            </Form>
          ))}
        </div>
      </section>

      <Form action={resetFormSettingsAction} confirm="Put every setting on this form back to the default?">
        <Hidden name="form" value={formKey} />
        <button className="ad__btn" type="submit">Reset to the defaults</button>
      </Form>
    </div>
  );
}
