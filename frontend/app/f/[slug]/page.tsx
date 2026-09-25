import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { WorkFooter } from "@/components/work/work-footer";
import { CustomFormView } from "@/components/forms/custom-form-view";
import { customFormBySlug, toFormDef } from "@/lib/forms/custom";
import { availability } from "@/lib/forms/settings-db";
import { SITE_URL } from "@/lib/site";
import "@/components/preview/preview.css";
import "@/components/forms/custom-form.css";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const row = await customFormBySlug(slug).catch(() => null);
  const def = row?.published;
  if (!def) return { title: "Form not found", robots: { index: false } };
  return {
    title: def.title,
    description: def.intro.slice(0, 155) || `${def.title}, from We Dig Creativity.`,
    alternates: { canonical: `${SITE_URL}/f/${slug}` },
    /* A form is a task, not a page to be found in search. */
    robots: { index: false, follow: true },
  };
}

/**
 * A FORM BUILT IN THE ADMIN, as the public answers it. The same opening as
 * every other page (the navy band with the eyebrow, the h1 and the lede),
 * then the form on the page's own ground.
 */
export default async function BuiltFormPage({ params }: Props) {
  const { slug } = await params;
  const row = await customFormBySlug(slug).catch(() => null);
  if (!row?.published) notFound();
  const def = row.published;
  const open = row.status === "live" ? await availability(toFormDef(row)) : { open: false as const, message: "This form is closed." };
  return (
    <>
      <Header overHero />
      <main id="main" tabIndex={-1} className="flex-1 pv">
        <section className="wk-hero">
          <div className="pv-wrap wk-hero__in">
            <span className="pv-eyebrow">Form</span>
            <h1 className="pv-mix">{def.title}</h1>
            {def.intro ? <p className="pv-lede">{def.intro}</p> : null}
          </div>
        </section>
        <section className="pv-sec">
          <div className="pv-wrap cf-wrap">
            {open.open
              ? <CustomFormView def={{ ...def, intro: "" }} slug={row.slug} />
              : <div className="cf-done" role="status"><b>Not taking entries</b><p>{open.message || "This form is closed."}</p></div>}
          </div>
        </section>
      </main>
      <WorkFooter />
    </>
  );
}
