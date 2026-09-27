import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/site-footer";
import { pendingNotice } from "@/lib/notice-address";
import "@/components/preview/preview.css";
import "@/components/work/work.css";

export const metadata: Metadata = {
  title: "Confirm an address",
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/**
 * Where the link in "Confirm this address" lands. A BUTTON, NOT A VISIT:
 * opening the link only asks, because inbox scanners open every link; the
 * button posts the token to /api/notice-address/confirm, which checks it.
 * The address is shown only once it is confirmed, never from the token alone.
 */
export default async function ConfirmNoticeAddress({ searchParams }: Props) {
  const sp = await searchParams;
  const token = one(sp.t);
  const done = one(sp.done) === "1";
  const busy = one(sp.busy) === "1";
  const failed = one(sp.error) === "1";
  const bad = one(sp.bad) === "1" || (!done && !busy && !failed && !token);
  const waiting = !done && !bad && !busy && !failed && Boolean(await pendingNotice().catch(() => null));

  const heading = done ? "Address confirmed" : waiting ? "Confirm this address?" : "This link does not work";
  const lede = done
    ? "The studio's notices and clients' replies come here from now on."
    : waiting
      ? "The studio's notices (new enquiries, briefs, tickets and payments) and clients' replies will come to the inbox this link was sent to."
      : busy
        ? "Too many tries from here just now. Wait a few minutes and open the link again."
        : failed
          ? "Something went wrong confirming it. Please open the link again in a minute."
          : "It may have expired (links last a day), been replaced by a newer one, or already been used. Ask for a new one from Settings, Email.";

  return (
    <>
      <Header overHero />
      <main id="main" tabIndex={-1} className="flex-1 pv">
        <section className="wk-hero">
          <div className="pv-wrap wk-hero__in">
            <span className="pv-eyebrow">Studio email</span>
            <h1 className="pv-mix">{heading}</h1>
            <p className="pv-lede">{lede}</p>
          </div>
        </section>
        <section className="pv-sec">
          <div className="pv-wrap">
            {waiting ? (
              <form method="post" action="/api/notice-address/confirm">
                <input type="hidden" name="t" value={token} />
                <button className="pv-btn" type="submit">Confirm this address</button>
              </form>
            ) : (
              <Link className="pv-btn" href="/">Back to the site</Link>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
