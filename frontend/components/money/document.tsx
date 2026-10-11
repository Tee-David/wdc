import Image from "next/image";
import { COMPANY_NAME, CONTACT_EMAIL, REGISTRATION_NO, SITE_URL } from "@/lib/site";
import { getSetting } from "@/lib/admin/store";
import QrCode from "@/components/ui/qr-code";
import Stamp, { type StampStatus } from "./stamp";
import { BarePage } from "@/components/layout/bare-page";
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
export type DocTag = { text: string; tone: "good" | "warn" | "bad" | "brand" | "flat" };

export function DocumentShell({
  kind, number, url, children, qrLabel, stamp, tag,
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
  /** The status under the number: a solid tag, one word or a short phrase. */
  tag?: DocTag;
}) {
  /* From Settings > Studio and invoices; every page that draws this has
     synced the settings first. */
  const tin = getSetting("finance.tin");
  const note = getSetting("finance.footerNote");
  return (
    <BarePage>
      <div className="doc">
      <article className="doc__sheet docSheet" aria-label={`${kind} ${number}`}>
        <Image className="doc__watermark" src="/brand/document-watermark.png" alt="" width={300} height={300} aria-hidden="true"/>
        <header className="doc__top dsHead">
          <div className="doc__who">
            {/* A fixed width and height, so the sheet does not reflow when the
                mark loads. Same rule as everywhere else on the site. */}
            <Image className="doc__logoLight" src="/brand/icon-navy.svg" alt="" width={40} height={40} priority />
            {/* The navy mark vanishes on the dark theme; this one is white with the orange nib. */}
            <Image className="doc__logoDark" src="/brand/icon-white-accent.svg" alt="" width={40} height={40} priority />
            <span>
              <b>We Dig Creativity</b>
              <small>{REGISTRATION_NO}{tin ? ` · TIN ${tin}` : ""}</small>
            </span>
          </div>
          <div className="doc__id">
            <h1 className="doc__no">{kind} {number}</h1>
            {tag ? <span className={`bareTag is-${tag.tone}`}>{tag.text}</span> : null}
          </div>
        </header>

        <div className="doc__body dsBody">
        {children}
        </div>

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
            {COMPANY_NAME}<br />
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a><br />
            Scan to verify {kind.toLowerCase()}.
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
      </div>
    </BarePage>
  );
}

/** The totals under the lines: label and figure on one row each, the last row
    (the one you pay or were paid) larger. A block, not table rows, so on a phone
    the figures never scroll out of sight with the table above them. */
export function DocTotals({ rows }: { rows: { k: string; v: string; strong?: boolean }[] }) {
  return (
    <dl className="doc__tot">
      {rows.map((r) => (
        <div key={r.k} className={r.strong ? "is-strong" : undefined}>
          <dt>{r.k}</dt>
          <dd>{r.v}</dd>
        </div>
      ))}
    </dl>
  );
}

const NOTE_ICON = { good: "M5 12l5 5L20 7", bad: "M12 8v5M12 17h.01", warn: "M12 8v5M12 17h.01" } as const;

/** A sentence at the top of the sheet that says where this document stands:
    a solid green, amber or red panel with white type (the board's okNote,
    warnNote and errNote). `children` is the sentence. */
export function DocNote({ tone = "good", children }: { tone?: "good" | "warn" | "bad"; children: React.ReactNode }) {
  return (
    <div className={`doc__note2 ${tone === "good" ? "okNote" : tone === "bad" ? "errNote" : "warnNote"}`} role="status">
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={NOTE_ICON[tone]} /></svg>
      <span>{children}</span>
    </div>
  );
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function lagos(iso: string) {
  const out: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso))) out[p.type] = p.value;
  return out;
}
/** Whole calendar days from today to an ISO date: 4 is four days away, -3 is three days past. */
export function daysFromToday(iso: string) {
  return Math.floor(new Date(iso).getTime() / 86_400_000) - Math.floor(Date.now() / 86_400_000);
}
/** `14 Oct 2026`, the way documents carry a date. */
export function docDay(iso: string) {
  const d = lagos(iso);
  return `${Number(d.day)} ${MONTHS[Number(d.month) - 1]} ${d.year}`;
}
/** `9 Oct 2026, 14:22`, 24 hour clock. */
export function docTime(iso: string) {
  const d = lagos(iso);
  return `${Number(d.day)} ${MONTHS[Number(d.month) - 1]} ${d.year}, ${d.hour}:${d.minute}`;
}

/** Where these documents live, so the QR and any emailed link agree. */
export const invoiceUrl = (token: string) => `${SITE_URL}/i/${token}`;
export const receiptUrl = (token: string) => `${SITE_URL}/r/${token}`;
export const estimateUrl = (token: string) => `${SITE_URL}/q/${token}`;
