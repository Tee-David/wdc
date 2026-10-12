"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDays, Download, Filter, Users } from "lucide-react";
import { Dialog } from "./dialog";
import { FilterPick } from "./pick";
import { RowMenu, type RowMenuItem } from "./row-menu";

type Opt = { value: string; label: string };

/** The ⋮ menu in the Projects head: chores that are not "open a project". */
export function ProjectsChores({ exportHref, meetings }: { exportHref?: string; meetings: boolean }) {
  const items: RowMenuItem[] = [
    ...(meetings ? [{ kind: "link" as const, label: "Meetings", href: "/admin/meetings", icon: CalendarDays }] : []),
    { kind: "link", label: "Clients", href: "/admin/clients", icon: Users },
    ...(exportHref ? [{ kind: "link" as const, label: "Export projects", href: exportHref, icon: Download, external: true }] : []),
  ];
  return <RowMenu items={items} label="projects, more" />;
}

/**
 * The Filters sheet: the facets that are not a chip, a tab or the search box (stage, how it is going, lead).
 * A plain GET form, so the choice lands in the address bar and a filtered list is a link. `keep` carries
 * every other filter through.
 */
export function ProjectFilters({ keep, stage, health, owner, stages, healths, owners, active }: {
  keep: Record<string, string | undefined>;
  stage: string; health: string; owner: string;
  stages: Opt[]; healths: Opt[]; owners: Opt[];
  active: number;
}) {
  const [open, setOpen] = useState(false);
  const clear = new URLSearchParams(Object.entries(keep).filter(([, v]) => !!v) as [string, string][]).toString();
  return (
    <>
      <button type="button" className="ad__btn" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <Filter aria-hidden="true" />Filters{active ? <span className="adList__n" style={{ marginLeft: ".25rem" }}>{active}</span> : null}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Filter projects">
        {open ? (
          <form method="get" action="/admin/projects" className="ad__fields" onSubmit={() => setOpen(false)}>
            {Object.entries(keep).map(([k, v]) => v ? <input key={k} type="hidden" name={k} value={v} /> : null)}
            <FilterPick label="Stage" name="stage" defaultValue={stage} placeholder="Any stage" options={stages} />
            <FilterPick label="How it is going" name="health" defaultValue={health} placeholder="Any" options={healths} />
            {owners.length ? <FilterPick label="Lead" name="owner" defaultValue={owner} placeholder="Anyone" options={owners} /> : null}
            <div className="ad__formActions">
              <Link className="ad__btn" href={`/admin/projects${clear ? `?${clear}` : ""}`} onClick={() => setOpen(false)}>Clear filters</Link>
              <button className="ad__btn ad__btn--primary" type="submit">Show projects</button>
            </div>
          </form>
        ) : null}
      </Dialog>
    </>
  );
}
