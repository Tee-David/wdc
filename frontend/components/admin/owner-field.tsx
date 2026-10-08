"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { UserPlus, X } from "lucide-react";
import { searchOptions } from "@/lib/admin/search-actions";
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
  /* Names the record already carries are matched to accounts as the team is searched, and ids picked here are remembered. */
  const [ids, setIds] = useState<Record<string, string>>(() => {
    const names = kept.split(",").map((x) => x.trim()).filter(Boolean);
    return names.length === defaultIds.length ? Object.fromEntries(names.map((n, i) => [n, defaultIds[i]])) : {};
  });
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  /* The team is searched on the server as the person types (200ms after the last key); there is no list to cut off at a fixed number. */
  const [found, setFound] = useState<{ q: string; people: { id: string; name: string }[] } | null>(null);
  const list = useId();
  const asked = useRef(new Set<string>());
  const needle = q.trim().toLocaleLowerCase();
  useEffect(() => {
    if (!open) return;
    let stale = false;
    const t = window.setTimeout(() => {
      searchOptions("staff", q.trim()).then((r) => { if (!stale) setFound({ q: q.trim(), people: r.rows.map((x) => ({ id: x.value, name: x.label })) }); }).catch(() => {});
    }, q.trim() ? 200 : 0);
    return () => { stale = true; window.clearTimeout(t); };
  }, [open, q]);
  useEffect(() => {
    /* A name typed before accounts were linked gets its id once, if exactly one person has it. */
    const loose = picked.filter((n) => !ids[n] && !asked.current.has(n));
    if (!loose.length) return;
    loose.forEach((n) => asked.current.add(n));
    loose.forEach((n) => searchOptions("staff", n).then((r) => {
      const hit = r.rows.filter((x) => x.label.toLocaleLowerCase() === n.toLocaleLowerCase());
      if (hit.length === 1) setIds((m) => (m[n] ? m : { ...m, [n]: hit[0].value }));
    }).catch(() => {}));
  }, [picked, ids]);
  const postedIds = picked.map((n) => ids[n]).filter(Boolean).join(",");

  const settled = found !== null && found.q === q.trim();
  const matches = (found?.people ?? []).filter((p) => !picked.includes(p.name)).slice(0, 8);
  const canAddTyped = settled && needle.length > 1 && !(found?.people ?? []).some((p) => p.name.toLocaleLowerCase() === needle) && !picked.some((n) => n.toLocaleLowerCase() === needle);
  const add = (n: string, id?: string) => { if (id) setIds((m) => ({ ...m, [n]: id })); setPicked((p) => (p.includes(n) ? p : [...p, n])); setQ(""); };

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
              if (e.key === "Enter") { e.preventDefault(); if (matches[0]) add(matches[0].name, matches[0].id); else if (canAddTyped) add(q.trim()); }
              if (e.key === "Escape") setOpen(false);
            }} />
          {open && (matches.length || canAddTyped) ? (
            <ul id={list} role="listbox" className="ad__ownerList">
              {matches.map((p) => (
                <li key={p.id} role="option" aria-selected="false"><button type="button" onClick={() => add(p.name, p.id)}>{p.name}</button></li>
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
