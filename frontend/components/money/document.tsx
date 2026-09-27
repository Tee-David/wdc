import Image from "next/image";
import { COMPANY_NAME, CONTACT_EMAIL, REGISTRATION_NO, SITE_URL } from "@/lib/site";
import { naira } from "@/lib/admin/types";
import { getSetting } from "@/lib/admin/store";
import QrCode from "@/components/ui/qr-code";
import Stamp, { type StampStatus } from "./stamp";
import "./document.css";

/**
 * The shell both public money documents sit in.
 *
 * ONE COMPONENT FOR THE INVOICE AND THE RECEIPT, because they are the same
 * object at two moments: a statement of what is owed, and a statement that it
 * arrived. Sharing the frame means the client sees one document design rather
 * than two that nearly match, and it means the QR, the print rules and the
 * registered-company footer are written once.
 *
 * IT CARRIES ITS OWN QR. The code on the page points at the page itself, which
 * sounds circular and is not: these are printed and handed over, and the whole
 * point of the code on paper is to get the reader back to the live version
 * that knows whether the money has since arrived.
 */
export function DocumentShell({
  kind, number, url, children, qrLabel, stamp,
}: {
  kind: string;
  number: string;
  url: string;
  qrLabel: string;
  children: React.ReactNode;
  /**
   * The rubber stamp in the bottom right.
   *
   * Optional, and it should stay optional: a document with nothing worth
   * stamping is better with an empty corner than with a mark that means
   * "no particular state". The page decides, because the page is what knows
   * whether the money arrived.
   */
  stamp?: StampStatus;
}) {
  /* From Settings > Studio and invoices; every page that draws this has
     synced the settings first. */
  const tin = getSetting("finance.tin");
  const note = getSetting("finance.footerNote");
  return (
    <main className="doc">
      <article className="doc__sheet">
        <header className="doc__top">
          <div className="doc__who">
            {/* A fixed width and height, so the sheet does not reflow when the
                mark loads. Same rule as everywhere else on the site. */}
            <Image src="/brand/icon-navy.svg" alt="" width={40} height={40} priority />
            <span>
              <b>We Dig Creativity</b>
              <small>{REGISTRATION_NO}{tin ? ` · TIN ${tin}` : ""}</small>
            </span>
          </div>
          <div className="doc__id">
            <div className="doc__kind">{kind}</div>
            <div className="doc__no">{number}</div>
          </div>
        </header>

        {children}

        {/* THE STAMP SITS HERE IN THE DOM, NOT AT THE TOP.

            On screen it is absolutely positioned into the sheet's bottom right
            and its place in the markup does not matter. On PAPER it does: an
            absolutely positioned box in paged media lands on whichever page
            its containing block starts on, so a stamp declared first printed
            on page one of a three-page invoice -- over the line items, nowhere
            near the total it is describing. Declared here it can simply go
            static when printing and fall where it belongs, beside the footer
            on the last sheet. */}
        {stamp ? <Stamp status={stamp} seed={number} className="doc__stamp" /> : null}

        <footer className="doc__foot">
          <small>
            {note ? <span className="doc__studioNote">{note}</span> : null}
            {COMPANY_NAME}. Questions about this {kind.toLowerCase()} go to{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. This page is
            the live version: scan the code to reopen it from a printed copy.
          </small>
          <div className="doc__qr">
            {/* `animate={false}`: this is a document, and on a printed one the
                animation is invisible anyway. */}
            {/* 160, because these codes measurably do not decode at the
                136 the blog rail uses. See the note in qr-code.css. */}
            <QrCode url={url} label={qrLabel} animate={false} boxPx={160} />
          </div>
        </footer>
      </article>
    </main>
  );
}

/** A figure with its own label, sized to be the thing you see first. */
export function Headline({
  label, amount, clear, pill,
}: {
  label: string;
  amount: number;
  clear?: boolean;
  pill?: { text: string; tone: "good" | "bad" | "warn" | "due" };
}) {
  return (
    <div className={`doc__owed${clear ? " is-clear" : ""}`}>
      <span className="doc__k">{label}</span>
      <b>{naira(amount)}</b>
      {pill ? <span className={`doc__pill doc__pill--${pill.tone}`}>{pill.text}</span> : null}
    </div>
  );
}

/** Where these documents live, so the QR and any emailed link agree. */
export const invoiceUrl = (token: string) => `${SITE_URL}/i/${token}`;
export const receiptUrl = (token: string) => `${SITE_URL}/r/${token}`;
export const estimateUrl = (token: string) => `${SITE_URL}/q/${token}`;
