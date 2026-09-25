import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ServiceIcon from "@/components/ui/service-icon";
import { toolsFor, type FreeTool } from "@/lib/tools";
import type { ServiceSlug } from "@/lib/services";

import "./service-tools.css";

/**
 * The free tools that belong to one service, on that service's page.
 *
 * WHY IT EXISTS AT ALL. `/tools/domain` and `/tools/email` had both shipped --
 * server-rendered, indexable, in the sitemap -- and nothing anywhere on the
 * site linked to either of them. A visitor reading the web service page, who
 * is precisely the person the domain checker was built for, had no way to
 * find it short of guessing the URL.
 *
 * WHERE IT SITS, and the reasoning is conversion rather than taste: after the
 * work we have shipped and before the questions people ask. By that point the
 * reader has the argument and the proof, and "here is one you can use right
 * now, without talking to anyone" is the natural next beat. Put above the
 * proof it interrupts the case; put below the FAQs nobody reaches it.
 *
 * IT RENDERS NOTHING FOR A SERVICE WITH NO TOOLS, so the four service pages
 * that have none are untouched and the three tools still to build appear the
 * moment they are added to `lib/tools.ts`.
 */
export function ServiceTools({ service }: { service: ServiceSlug }) {
  const tools = toolsFor(service);
  if (tools.length === 0) return null;

  return (
    <section className="pv-sec">
      <div className="pv-wrap">
        <div className="pv-head pv-reveal">
          <span className="pv-eyebrow">Free, and yours</span>
          <h2 className="pv-mix">Try one <b>before you talk to us</b></h2>
          <p className="pv-lede">
            No sign-up, no email, no drip sequence afterwards. Answers in a few
            seconds, and they are the same checks we run on our own work.
          </p>
        </div>

        <ToolCards tools={tools} />
      </div>
    </section>
  );
}

/** The cards themselves, shared with the /tools page so a tool looks the
 *  same wherever it is offered. */
export function ToolCards({ tools }: { tools: FreeTool[] }) {
  return (
    <div className="svc-tools">
      {tools.map((t, n) => (
        /* THE WHOLE CARD IS THE LINK, not a card containing one. A card
           with a button in the corner gives a thumb one target where the
           eye sees a whole panel, and it is the commonest reason a tile
           feels unresponsive on a phone. */
        <Link className="svc-tool pv-reveal" key={t.slug} href={t.href}>
          <span className="svc-tool__ic" aria-hidden="true">
            {/* Staggered, the way every other icon row on the site draws:
                one at a time rather than all at once. */}
            <ServiceIcon name={t.icon} size={19} delay={n * 120} />
          </span>
          <span className="svc-tool__body">
            <span className="svc-tool__t">{t.title}</span>
            <span className="svc-tool__d">{t.blurb}</span>
            <span className="svc-tool__go">
              {t.action}
              <ArrowRight aria-hidden="true" />
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}

export default ServiceTools;
