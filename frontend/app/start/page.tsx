import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { WorkFooter } from "@/components/work/work-footer";
import StartForm from "@/components/start/start-form";
import { SITE_URL } from "@/lib/site";
import "@/components/preview/preview.css";
import "@/components/forms/custom-form.css";

export const metadata: Metadata = {
  title: "Start a project",
  description: "Four short screens and your project is with us. We will review your project and get back to you.",
  alternates: { canonical: `${SITE_URL}/start` },
};

export default async function StartPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = (await searchParams).services;
  const services = (typeof raw === "string" ? raw : "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 6);
  return (
    <>
      <Header overHero />
      <main id="main" tabIndex={-1} className="flex-1 pv">
        <section className="wk-hero">
          <div className="pv-wrap wk-hero__in">
            <span className="pv-eyebrow">Start a project</span>
            <h1 className="pv-mix">Tell us what you <b>want to build</b></h1>
            <p className="pv-lede">
              Four short screens, two questions each. We read every enquiry and will get back to you.
            </p>
          </div>
        </section>
        <section className="pv-sec">
          <div className="pv-wrap cf-wrap">
            <StartForm services={services} />
          </div>
        </section>
      </main>
      <WorkFooter />
    </>
  );
}
