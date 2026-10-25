"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { savePreloader } from "@/lib/admin/site-actions";
import { PRELOADERS, type PreloaderId } from "@/lib/preloader-options";
import { Panel } from "@/components/admin/bits";
import { SettingsForm } from "./kit";

/**
 * The preloader, chosen from a gallery, the way the maintenance page is.
 *
 * Preview opens a page of the site in a new tab with that preloader (the
 * `?loader=` preview, which holds for that tab only), so the choice is made by
 * watching rather than by name. The thumbnails are captured from the
 * preloaders themselves by scripts/capture-preloader-thumbs.mjs.
 */
export function PreloaderChoice({ current }: { current: PreloaderId }) {
  const [sel, setSel] = useState<PreloaderId>(current);
  const box = useRef<HTMLDivElement>(null);
  /* Discard puts the radios back; the highlighted card follows them. */
  useEffect(() => {
    const form = box.current?.closest("form");
    if (!form) return;
    const back = () => setSel(current);
    form.addEventListener("reset", back);
    return () => form.removeEventListener("reset", back);
  }, [current]);

  return (
    <SettingsForm action={savePreloader}>
      <Panel title="Preloader">
        <div ref={box} className="adSetPad adMt">
          <p className="ad__dim adMt__intro">What plays when someone first opens the site, and as the curtain between its pages. Preview either one; nothing changes until you save. It never plays for visitors whose device asks for less motion.</p>
          <fieldset className="adMt__set">
            <legend className="ad__fl">Preloader</legend>
            <div className="adMt__grid">
              {PRELOADERS.map((p, i) => (
                <div key={p.id} className={`adMt__card${sel === p.id ? " is-on" : ""}`}>
                  <label className="adMt__pick">
                    <input type="radio" name="preloader" value={p.id} defaultChecked={current === p.id} onChange={() => setSel(p.id)} />
                    {/* eslint-disable-next-line @next/next/no-img-element -- a fixed-size capture, already the size it is shown at */}
                    <img src={`/preloader/thumbs/${p.id}.webp`} alt="" width={480} height={300} loading="lazy" decoding="async" />
                    <span className="adMt__meta">
                      <b><span className="adMt__n">{String(i + 1).padStart(2, "0")}</span>{p.name}</b>
                      <small>{p.line}</small>
                    </span>
                    {current === p.id ? <span className="adMt__tag">In use</span> : null}
                  </label>
                  <a className="ad__btn adMt__pv" href={`/about?loader=${p.id}`} target="_blank" rel="noopener"
                    aria-label={`Preview ${p.name} in a new tab`}>
                    Preview <ExternalLink aria-hidden="true" />
                  </a>
                </div>
              ))}
            </div>
          </fieldset>
        </div>
      </Panel>
    </SettingsForm>
  );
}
