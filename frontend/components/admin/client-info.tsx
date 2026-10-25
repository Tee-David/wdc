"use client";

import { Info, Mail, MessageCircle, Phone } from "lucide-react";
import { DialogButton } from "./dialog";
import { CopyText } from "./copy-text";

/**
 * EVERYTHING ABOUT THE CLIENT THAT THE HEAD DOES NOT NEED TO SAY. The head
 * keeps the name, the contact and anything that is wrong; the rest (how to
 * reach them, since when, portal access, services and tags) opens here, so the
 * head stays one calm block on a phone and a tablet.
 */
export function ClientInfo({ company, contact, email, phone, waHref, since, portal, state, services, tags }: {
  company: string; contact: string; email: string; phone: string; waHref: string | null;
  since: string; portal: { label: string; tone: "good" | "warn" | "flat" }; state: string; services: string[]; tags: string[];
}) {
  return (
    <DialogButton label="Client details" title={company} icon={Info} tone="plain" iconOnly>
      {() => (
        <div className="adCi">
          <section className="adCi__part" aria-label="How to reach them">
            <h3>{contact}</h3>
            <div className="adCi__reach">
              {email ? (
                <div className="adCi__row">
                  <a className="adCi__link" href={`mailto:${email}`}>
                    <span className="adCi__ic adCi__ic--mail" aria-hidden="true"><Mail /></span>
                    <span className="adCi__txt"><small>Email</small><b>{email}</b></span>
                  </a>
                  <CopyText text={email} label="Copy the email address" iconOnly />
                </div>
              ) : null}
              {phone ? (
                <div className="adCi__row">
                  <a className="adCi__link" href={`tel:${phone.replace(/\s/g, "")}`}>
                    <span className="adCi__ic adCi__ic--phone" aria-hidden="true"><Phone /></span>
                    <span className="adCi__txt"><small>Phone</small><b>{phone}</b></span>
                  </a>
                </div>
              ) : null}
              {waHref ? (
                <div className="adCi__row">
                  <a className="adCi__link" href={waHref} target="_blank" rel="noopener noreferrer">
                    <span className="adCi__ic adCi__ic--wa" aria-hidden="true"><MessageCircle /></span>
                    <span className="adCi__txt"><small>WhatsApp</small><b>Open a chat</b></span>
                  </a>
                </div>
              ) : null}
            </div>
          </section>
          <dl className="adCi__facts">
            <div><dt>Status</dt><dd>{state}</dd></div>
            <div><dt>Client since</dt><dd>{since}</dd></div>
            <div><dt>Portal</dt><dd><span className={`ad__pill ad__pill--${portal.tone}`}>{portal.label}</span></dd></div>
          </dl>
          {services.length ? (
            <section className="adCi__part" aria-label="Services">
              <h4>Services</h4>
              <p className="adCi__tags">{services.map((s) => <span key={s} className="ad__pill ad__pill--flat">{s}</span>)}</p>
            </section>
          ) : null}
          {tags.length ? (
            <section className="adCi__part" aria-label="Tags">
              <h4>Tags</h4>
              <p className="adCi__tags">{tags.map((t) => <span key={t} className="ad__pill ad__pill--flat">{t}</span>)}</p>
            </section>
          ) : null}
        </div>
      )}
    </DialogButton>
  );
}
