import ServiceIcon from "@/components/ui/service-icon";
import "./business-setup.css";

/**
 * Getting the business itself registered, beneath the identity work.
 *
 * WHY IT SITS ON THE BRAND PAGE and not in a service of its own. A CAC
 * certificate and a logo are both identity documents: one satisfies a bank,
 * the other satisfies a customer, and the person who needs one is almost
 * always the person who needs the other in the same month. Splitting them into
 * two services would mean a founder reading about their logo never learns we
 * can register the company it belongs to. See docs/business-setup.md.
 *
 * IT IS AFTER THE IDENTITY WORK, DELIBERATELY. Somebody who came for a logo
 * should meet the logo work first.
 *
 * WHAT IS NOT CLAIMED HERE, because two of these are commonly oversold:
 *
 *   The TAX ID is not a product. Since CAC's integration with the revenue
 *   service it is issued automatically when a registration is approved, so
 *   anybody charging a separate fee for "TIN registration" is charging for
 *   something that already happened. We say that plainly and make sure it is
 *   actually live instead.
 *
 *   SCUML AND "EFCC REGISTRATION" ARE THE SAME THING. SCUML is the unit
 *   inside the EFCC, so a list offering both is offering one registration
 *   twice. It is also not for everybody: it applies to the trades the Money
 *   Laundering (Prevention and Prohibition) Act 2022 designates, and a bank
 *   asks for it before opening a corporate account for one of those.
 */

type Item = { icon: string; title: string; body: string; note?: string };

const ITEMS: Item[] = [
  {
    icon: "FileText",
    title: "CAC registration",
    body:
      "A business name or a limited company, filed for you. We check the register first, reserve the name, and send you the certificate.",
  },
  {
    icon: "Receipt",
    title: "Your tax ID",
    body:
      "It arrives with the registration now, automatically. Nobody should be charging you for it.",
    note: "Included",
  },
  {
    icon: "Landmark",
    title: "Corporate bank account",
    body:
      "The documents banks ask for, in the order they ask for them, so you are not sent away twice.",
  },
  {
    icon: "ShieldCheck",
    title: "SCUML certificate",
    body:
      "Only some trades need it: estate agents, car dealers, hotels, jewellers, consultants and a few more. If yours is one, the bank will ask before it opens the account.",
    note: "Only if it applies",
  },
  {
    icon: "BadgeCheck",
    title: "Trademark",
    body:
      "Registers the name and the mark, so the identity we design is yours to defend rather than yours to hope about.",
  },
  {
    icon: "RefreshCw",
    title: "Keeping it live",
    body:
      "Annual returns, a change of director, a new address. The filings that quietly lapse and cost more to fix than to do.",
  },
];

export default function BusinessSetup() {
  return (
    <section className="pv-sec bz" id="business-setup">
      <div className="pv-wrap">
        <div className="pv-head pv-reveal">
          <span className="pv-eyebrow">Before the brand</span>
          <h2 className="pv-mix">First, <b>the business has to exist</b></h2>
          <p className="pv-lede">
            A logo is not a company. We register the company too, so you are not
            running between us and somebody else while you are trying to start.
          </p>
        </div>

        <ul className="bz__grid">
          {ITEMS.map((item, n) => (
            <li className="bz__card" key={item.title}>
              <span className="wdc-tile" aria-hidden="true">
                <ServiceIcon name={item.icon} size={19} delay={n * 110} />
              </span>
              <h3 className="bz__t">
                {item.title}
                {item.note ? <em className="bz__note">{item.note}</em> : null}
              </h3>
              <p className="bz__d">{item.body}</p>
            </li>
          ))}
        </ul>

        {/* THE HONEST FOOTNOTE, in one line rather than a panel. Two of the six
            are routinely sold as things they are not, and saying so is worth
            more than another paragraph of reassurance. */}
        <p className="bz__foot">
          Timelines and government fees are set by the Commission, not by us. We
          tell you both before anything is filed.
        </p>
      </div>
    </section>
  );
}
