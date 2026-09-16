"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  estimateAll, REVIEWED, shortCount, shortNaira,
} from "@/lib/ad-budget";

/**
 * The ad budget & reach calculator at /tools/ad-budget.
 *
 * ANSWERS AS YOU TYPE, THE SAME PATTERN AS THE AI COST CALCULATOR: one number
 * in, a table of platforms out, all of it pure arithmetic on the reader's own
 * device. There is nothing to submit because there is nothing that needs a
 * server -- `lib/ad-budget.ts` is a published CPM range and a division.
 */
export default function AdBudget() {
  const [budget, setBudget] = useState("100000");

  const parsed = Number.isFinite(Number(budget)) ? Math.max(0, Number(budget)) : 0;
  const rows = useMemo(() => estimateAll(parsed), [parsed]);
  const widest = rows.reduce((a, b) => (b.impressions[1] > a.impressions[1] ? b : a), rows[0]);

  return (
    <div className="tl">
      <form className="tl__form" onSubmit={(e) => e.preventDefault()}>
        <label className="tl__label" htmlFor="ab-budget">Monthly ad budget</label>
        <div className="tl__row">
          <input
            id="ab-budget"
            className="tl__input sn__priceIn"
            type="number"
            min={0}
            inputMode="numeric"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            aria-describedby="ab-budget-hint"
          />
        </div>
        <p className="tl__hint" id="ab-budget-hint">
          In naira, media spend only -- what you would actually hand a platform,
          not our fee for running the campaign.
        </p>
      </form>

      <div className="tl__out" aria-live="polite">
        <div className="es__range">
          <p className="tl__stepK">The widest reach that budget buys</p>
          <p className="es__ngn">
            {shortCount(widest.impressions[0])} <i aria-hidden="true">to</i>{" "}
            {shortCount(widest.impressions[1])}
          </p>
          <p className="es__usd">
            impressions on {widest.platform.name}, the platform with the cheapest reach
            for this budget. Ranges reviewed {REVIEWED}.
          </p>
          <p className="es__caveat">
            A range, not a promise. CPM moves with your audience, the season and the
            creative itself; this is what the platforms themselves publish for this
            market, not a figure we invented.
          </p>
        </div>

        <h3 className="es__h">Platform by platform</h3>
        <ul className="ai__list">
          {rows.map((row) => (
            <li key={row.platform.key}>
              <span className="ai__name">
                {row.platform.name}
                <b>{shortNaira(row.platform.cpmNgn[0])}&ndash;{shortNaira(row.platform.cpmNgn[1])} per 1,000 views</b>
              </span>
              <span className="ai__money">
                {shortCount(row.impressions[0])}&ndash;{shortCount(row.impressions[1])}
                <b>{shortCount(row.clicks[0])}&ndash;{shortCount(row.clicks[1])} clicks</b>
              </span>
              <span className="ai__note">{row.platform.note}</span>
            </li>
          ))}
        </ul>

        <div className="es__assume">
          <h3 className="es__h">What this does not include</h3>
          <ul className="es__bullets">
            <li>
              Our fee for planning, building and running the campaign. This is media
              spend only, the cheque that goes to the platform itself.
            </li>
            <li>
              Creative production. The same budget on a strong video and a stock photo
              does not buy the same result, and the range above assumes an ordinary
              creative rather than a great or a poor one.
            </li>
            <li>
              A minimum viable budget. Under roughly ₦50,000 a month, most platforms do
              not have enough spend to learn who to show your ad to, and the numbers
              above get less reliable the smaller the figure you put in.
            </li>
          </ul>
        </div>

        <div className="tl__step">
          <p className="tl__stepK">Worth saying plainly</p>
          <h3>Reach is not the same as results</h3>
          <p>
            The numbers above answer &ldquo;how many people will see or click this&rdquo;,
            not &ldquo;how many will buy&rdquo;. That second number depends on the offer,
            the landing page and the audience, which is the part a platform&rsquo;s own
            calculator never tells you.
          </p>
          <div className="tl__stepActs">
            <Link className="pv-btn pv-btn--accent" href="/contact">
              Talk it through
            </Link>
            <Link className="pv-btn pv-btn--light" href="/services/social">
              See our social & PPC work
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
