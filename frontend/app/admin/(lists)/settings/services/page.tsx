import Link from "next/link";
import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { AdminState } from "@/components/admin/admin-state";
import { Head } from "@/components/admin/settings/kit";
import { persistSoon, syncStore } from "@/lib/admin/persist";
import { getProjects } from "@/lib/admin/store";
import { STAGES } from "@/lib/admin/types";
import { SERVICES } from "@/lib/services";
import { kindsFor, type WorkspaceService } from "@/lib/workspace/service-model";
import { serviceGlyph } from "@/components/client/service-glyph";

export const metadata = { title: "Services" };

/**
 * SERVICES: what the studio sells and how each kind of project is worked, read from the code and the records, never
 * invented. A service's name, what it covers and what the client receives come from lib/services.ts (the same words
 * the public site uses); the work types in its project tab come from lib/workspace/service-model.ts; the counts are
 * the projects on file. Every service moves through the same six stages today, so the page says so rather than
 * drawing a different stepper for each. Changing a service's stages or work types is a code change.
 */
export default async function ServicesSettings() {
  if (!can(await adminRole(), "settings")) {
    return <section className="ad__panel"><AdminState kind="forbidden" back={{ href: "/admin/settings", label: "Back to settings" }} title="Services are for Admin" description="What the studio sells and how each kind of project is worked." /></section>;
  }
  await syncStore();
  persistSoon();
  const projects = getProjects();
  return (
    <>
      <Head title="Services" line="What the studio sells and how each kind of project is worked." />
      <p className="adSet__note" role="note">Every project moves through the same six stages: {STAGES.join(", ")}. What differs by service is the work in its project tab, listed below. Changing these is a change to the site&rsquo;s code, so ask a developer.</p>
      <div className="adSet__cards">
        {SERVICES.map((s) => {
          const mine = projects.filter((p) => p.service === s.slug);
          const live = mine.filter((p) => p.stage !== "Delivered").length;
          const types = kindsFor(s.slug as WorkspaceService).map((k) => k.label);
          return (
            <section key={s.slug} className="ad__panel" aria-label={s.name}>
              <div className="adSet__row adSet__row--static">
                <span className="adSet__icon" aria-hidden="true">{serviceGlyph(s.slug)}</span>
                <span className="adSet__text"><b>{s.name}</b><small>{s.lede}</small></span>
                <span className="adSet__end">
                  <span className="ad__pill ad__pill--flat">{live} live</span>
                  <span className="ad__pill ad__pill--flat">{mine.length} in all</span>
                </span>
              </div>
              <dl className="adSet__facts">
                <div><dt>Work types in its project tab</dt><dd>{types.join(", ")}</dd></div>
                <div><dt>What the client receives</dt><dd>{s.deliverables.slice(0, 5).join(", ")}{s.deliverables.length > 5 ? `, and ${s.deliverables.length - 5} more` : ""}</dd></div>
                <div><dt>Where it shows</dt><dd><Link href={`/services/${s.slug}`}>The public page</Link>, <Link href={`/admin/projects?service=${s.slug}`}>its projects</Link></dd></div>
              </dl>
            </section>
          );
        })}
      </div>
    </>
  );
}
