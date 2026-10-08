"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { UserPlus, X } from "lucide-react";
import { staffPeople } from "@/lib/admin/staff-actions";
import { Wrap, useKept } from "./form";

/**
 * WHO IS ANSWERABLE: one or more people, picked from the team by search.
 *
 * Posts one `owner` value, the names joined with ", " (the project keeps a
 * plain string, so nothing downstream changes). A name that is not on the team
 * yet can be typed and added, with a link to invite them properly; the person
 * answerable can be staff, management, or both.
 */
export function OwnerField({ name = "owner", defaultValue = "", defaultIds = [], label = "Who is answerable", half }: {
  name?: string; defaultValue?: string; defaultIds?: string[]; label?: string; half?: boolean;
}) {
  const kept = String(useKept(name, defaultValue) ?? "");
  const [picked, setPicked] = useState<string[]>(() => kept.split(",").map((s) => s.trim()).filter(Boolean));
  const [people, setPeople] = useState<{ id: string; name: string }[]>([]);
  const staff = useMemo(() => people.map((p) => p.name), [people]);
  /* Names the record already carries are matched to accounts once the team has loaded. */
  const [ids, setIds] = useState<Record<string, string>>(() => {
    const names = kept.split(",").map((x) => x.trim()).filter(Boolean);
    return names.length === defaultIds.length ? Object.fromEntries(names.map((n, i) => [n, defaultIds[i]])) : {};
  });
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const list = useId();
  useEffect(() => { let on = true; staffPeople().then((n) => on && setPeople(n)).catch(() => {}); return () => { on = false; }; }, []);
  const idOf = (n: string) => ids[n] ?? people.find((p) => p.name === n)?.id;
  const postedIds = picked.map(idOf).filter(Boolean).join(",");

  const needle = q.trim().toLocaleLowerCase();
  const matches = useMemo(
    () => staff.filter((n) => !picked.includes(n) && (!needle || n.toLocaleLowerCase().includes(needle))).slice(0, 8),
    [staff, picked, needle],
  );
  const canAddTyped = needle.length > 1 && !staff.some((n) => n.toLocaleLowerCase() === needle) && !picked.some((n) => n.toLocaleLowerCase() === needle);
  const add = (n: string) => { const id = people.find((p) => p.name === n)?.id; if (id) setIds((m) => ({ ...m, [n]: id })); setPicked((p) => (p.includes(n) ? p : [...p, n])); setQ(""); };

  return (
    <Wrap name={name} label={label} half={half}
      hint="Search the team and pick one or more. Someone not listed can be typed in, then invited from Users.">
      {(id) => (
        <div className="ad__owner" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
          <input type="hidden" name={name} value={picked.join(", ")} />
          <input type="hidden" name="ownerIds" value={postedIds} />
          {picked.length ? (
            <ul className="ad__ownerChips" aria-label="Answerable">
              {picked.map((n) => (
                <li key={n}>
                  <span>{n}</span>
                  <button type="button" onClick={() => setPicked((p) => p.filter((x) => x !== n))} aria-label={`Remove ${n}`}><X aria-hidden="true" /></button>
                </li>
              ))}
            </ul>
          ) : null}
          <input id={id} type="search" role="combobox" aria-expanded={open} aria-controls={list} aria-autocomplete="list"
            autoComplete="off" value={q} placeholder={picked.length ? "Add another person" : "Search the team"}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); if (matches[0]) add(matches[0]); else if (canAddTyped) add(q.trim()); }
              if (e.key === "Escape") setOpen(false);
            }} />
          {open && (matches.length || canAddTyped) ? (
            <ul id={list} role="listbox" className="ad__ownerList">
              {matches.map((n) => (
                <li key={n} role="option" aria-selected="false"><button type="button" onClick={() => add(n)}>{n}</button></li>
              ))}
              {canAddTyped ? (
                <li role="option" aria-selected="false">
                  <button type="button" onClick={() => add(q.trim())}><UserPlus aria-hidden="true" /> Add &ldquo;{q.trim()}&rdquo;</button>
                </li>
              ) : null}
            </ul>
          ) : null}
          {canAddTyped ? <Link className="ad__ownerInvite" href="/admin/users" target="_blank">Invite them to the team</Link> : null}
        </div>
      )}
    </Wrap>
  );
}
