import QrCode from "@/components/ui/qr-code";
import ShareRow from "@/components/ui/share-row";

import "./share.css";

/**
 * The two things somebody does once they have finished reading: pass it on, or
 * take it with them.
 *
 * ONE COMPONENT RATHER THAN THE SAME MARKUP TWICE. An article and a case study
 * end the same way, and they should keep ending the same way after either of
 * them is next edited. The wording is a prop; the shape, the spacing and the
 * order are not, because the order is the point -- sharing is the common act
 * and the code is the fallback for the one person holding a laptop who wants
 * the page on their phone.
 *
 * IT SITS IN ITS OWN GRID ROW, BELOW THE ARTICLE, on both pages. A sticky
 * contents rail releases at the edge of its grid area, so while the rail and
 * this block shared a row the rail went on travelling beside a share row and a
 * QR code long after there was any heading left to point at.
 */
export default function PageEnd({
  url,
  title,
  what,
  scanLabel,
}: {
  url: string;
  title: string;
  /** The noun for the accessible names: "post", "case study". */
  what: string;
  /** What the code opens, for anyone who cannot see it. */
  scanLabel: string;
}) {
  return (
    <div className="sh-end">
      <ShareRow url={url} title={title} what={what} />
      <div className="sh-keep">
        <p className="sh-k">Take it with you</p>
        <QrCode url={url} label={scanLabel} />
      </div>
    </div>
  );
}
