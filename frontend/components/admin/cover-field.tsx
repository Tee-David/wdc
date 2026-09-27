"use client";

import { useRef, useState } from "react";
import { Check, ImageUp, Images, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { MediaPicker } from "./media-picker";
import { uploadToMedia } from "./media-upload";
import { useFieldError } from "./form";

/**
 * THE POST'S COVER: uploaded from this device (click, or drop a photo on the
 * box) into the media library, or one of the site's own photographs picked
 * from a grid of thumbnails. No dropdown: a cover is chosen by looking at it.
 * The value posts as `cover`; the server accepts only the site's covers or an
 * address in our own bucket.
 */
export function CoverField({ defaultValue, covers }: { defaultValue: string; covers: { value: string; label: string }[] }) {
  const [value, setValue] = useState(defaultValue);
  const [state, setState] = useState<{ busy?: boolean; error?: string }>({});
  const [over, setOver] = useState(false);
  const [library, setLibrary] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const err = useFieldError("cover");

  const upload = async (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return setState({ error: "That is not a photo. Use a JPG, PNG, WebP or AVIF." });
    setState({ busy: true });
    const done = await uploadToMedia(f);
    if (!done.ok) return setState({ error: done.error });
    setValue(done.url);
    setState({});
  };
  const pickFile = (
    <input ref={file} type="file" className="adCover__file" accept="image/png,image/jpeg,image/webp,image/avif" disabled={state.busy}
      aria-describedby="cover-help"
      onChange={(e) => { void upload(e.target.files?.[0]); if (file.current) file.current.value = ""; }} />
  );

  return (
    <div className={`ad__f adCover${err || state.error ? " is-bad" : ""}`}>
      <span className="ad__fl" id="cover-label">Cover photograph<b aria-hidden="true"> *</b></span>
      <input type="hidden" name="cover" value={value} />

      <div
        className={`adCover__drop${value ? " has-shot" : ""}${over ? " is-over" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); void upload(e.dataTransfer.files?.[0]); }}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="The cover as readers will see it" />
            <span className="adCover__acts">
              <label className="ad__btn adCover__btn">
                <RefreshCw aria-hidden="true" /> Replace
                {pickFile}
              </label>
              <button type="button" className="ad__btn adCover__btn" onClick={() => setLibrary(true)}>
                <Images aria-hidden="true" /> Library
              </button>
              <button type="button" className="ad__btn adCover__btn" onClick={() => { setValue(""); setState({}); }}>
                <Trash2 aria-hidden="true" /> Remove
              </button>
            </span>
          </>
        ) : (
          <label className="adCover__empty">
            <span className="adCover__icon" aria-hidden="true"><ImageUp /></span>
            <b>Upload a cover photo</b>
            <small>Click to choose, or drop a photo here</small>
            {pickFile}
          </label>
        )}
        {state.busy ? <span className="adCover__busy" role="status"><Loader2 className="ad__spin" aria-hidden="true" /> Uploading</span> : null}
      </div>

      {!value ? (
        <button type="button" className="ad__btn adCover__lib" onClick={() => setLibrary(true)}>
          <Images aria-hidden="true" /> Choose from the media library
        </button>
      ) : null}
      <MediaPicker open={library} onClose={() => setLibrary(false)} kind="image" title="Choose a cover from the library"
        onPick={(p) => { setValue(p.url); setState({}); }} />

      {state.error ? <small className="ad__fe" role="alert">{state.error}</small> : null}
      {err ? <small className="ad__fe" role="alert">{err}</small> : null}
      <small className="ad__fh" id="cover-help">JPG, PNG or WebP, at least 1600px wide. It is resized for each screen.</small>

      {covers.length ? (
        <details className="adCover__ours">
          <summary>Or use one of our photos</summary>
          <div className="adCover__grid" role="group" aria-label="Our photos">
            {covers.map((c) => {
              const on = c.value === value;
              return (
                <button key={c.value} type="button" className={`adCover__thumb${on ? " is-on" : ""}`} aria-pressed={on}
                  onClick={() => { setValue(c.value); setState({}); }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.value} alt="" loading="lazy" />
                  <span>{c.label}</span>
                  {on ? <Check className="adCover__tick" aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
        </details>
      ) : null}
    </div>
  );
}
