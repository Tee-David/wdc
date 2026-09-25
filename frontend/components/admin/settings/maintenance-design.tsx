"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { saveMaintenanceDesign } from "@/lib/admin/site-actions";
import { TEMPLATES, optionValue, type Design, type TemplateId } from "@/lib/maintenance-page/registry";
import { Panel } from "@/components/admin/bits";
import { SettingsForm, Text } from "./kit";

/**
 * The maintenance page, chosen from a gallery.
 *
 * Every template can be previewed in a new tab with the real message and
 * time (or sample times while the site is up), so the choice is made by
 * looking rather than by name. The thumbnails are captured from the preview
 * route by scripts/capture-maintenance-thumbs.mjs.
 */
export function MaintenanceDesign({ design, waiting }: { design: Design; waiting: React.ReactNode }) {
  const [sel, setSel] = useState<TemplateId>(design.template);
  const box = useRef<HTMLDivElement>(null);
  /* Discard puts the radios back; the options shown follow them. */
  useEffect(() => {
    const form = box.current?.closest("form");
    if (!form) return;
    const back = () => setSel(design.template);
    form.addEventListener("reset", back);
    return () => form.removeEventListener("reset", back);
  }, [design.template]);

  const current = TEMPLATES.find((t) => t.id === sel)!;
  return (
    <SettingsForm action={saveMaintenanceDesign}>
      <Panel title="Holding page">
        <div ref={box} className="adSetPad adMt">
          <p className="ad__dim adMt__intro">What visitors see while the site is in maintenance. Preview any of them; nothing changes until you save.</p>
          {waiting}
          <fieldset className="adMt__set">
            <legend className="ad__fl">Template</legend>
            <div className="adMt__grid">
              {TEMPLATES.map((t) => (
                <div key={t.id} className={`adMt__card${sel === t.id ? " is-on" : ""}`}>
                  <label className="adMt__pick">
                    <input type="radio" name="template" value={t.id} defaultChecked={design.template === t.id} onChange={() => setSel(t.id)} />
                    {/* eslint-disable-next-line @next/next/no-img-element -- a fixed-size capture, already the size it is shown at */}
                    <img src={`/maintenance/thumbs/${t.id}.webp`} alt="" width={480} height={300} loading="lazy" decoding="async" />
                    <span className="adMt__meta">
                      <b><span className="adMt__n">{t.id}</span>{t.name}</b>
                      <small>{t.line}</small>
                    </span>
                    {design.template === t.id ? <span className="adMt__tag">In use</span> : null}
                  </label>
                  <a className="ad__btn adMt__pv" href={`/api/maintenance/preview?template=${t.id}`} target="_blank" rel="noopener"
                    aria-label={`Preview ${t.name} in a new tab`}>
                    Preview <ExternalLink aria-hidden="true" />
                  </a>
                </div>
              ))}
            </div>
          </fieldset>
          {TEMPLATES.filter((t) => t.options.length).map((t) => (
            <div key={t.id} hidden={t.id !== sel} className="adMt__opts">
              {t.options.map((o) => (
                <Text key={o.key} name={`opt:${t.id}:${o.key}`} label={`${t.name}: ${o.label}`} hint={o.hint}
                  rows={o.rows} count={o.max} defaultValue={optionValue(design, t.id, o.key)} />
              ))}
            </div>
          ))}
          {!current.options.length ? <p className="ad__dim adMt__none">{current.name} has nothing else to set: it uses the message and back-by time from Maintenance mode.</p> : null}
        </div>
      </Panel>
    </SettingsForm>
  );
}
