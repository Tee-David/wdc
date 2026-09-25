"use client";

import { useRef, useState } from "react";
import { ImageUp, X } from "lucide-react";
import { uploadToMedia } from "./media-upload";
import { useFieldError } from "./form";

/**
 * THE POST'S COVER: one of the site's own photographs, or one uploaded from
 * this device into the media library. A preview shows what readers will see;
 * the value posts as `cover`, and the server accepts only the site's covers or
 * an address in our own bucket.
 */
export function CoverField({ defaultValue, covers }: { defaultValue: string; covers: { value: string; label: string }[] }) {
  const [value, setValue] = useState(defaultValue);
  const [state, setState] = useState<{ busy?: boolean; error?: string }>({});
  const file = useRef<HTMLInputElement>(null);
  const err = useFieldError("cover");
  const builtIn = covers.some((c) => c.value === value);

  const upload = async (f: File) => {
    setState({ busy: true });
    const done = await uploadToMedia(f);
    if (!done.ok) return setState({ error: done.error });
    setValue(done.url);
    setState({});
  };

  return (
    <div className={`ad__f adCover${err ? " is-bad" : ""}`}>
      <span className="ad__fl" id="cover-label">Cover photograph<b aria-hidden="true"> *</b></span>
      <input type="hidden" name="cover" value={value} />
      <div className="adCover__row">
        <span className="adCover__shot">
          {value
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={value} alt="" />
            : <span className="adCover__none">No cover yet</span>}
        </span>
        <div className="adCover__pick">
          <label className="ad__btn adCover__up">
            <ImageUp aria-hidden="true" /> {state.busy ? "Uploading..." : "Upload a photo"}
            <input ref={file} type="file" accept="image/png,image/jpeg,image/webp,image/avif" disabled={state.busy}
                   onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); if (file.current) file.current.value = ""; }} />
          </label>
          <select aria-labelledby="cover-label" value={builtIn ? value : ""} onChange={(e) => { if (e.target.value) setValue(e.target.value); }}>
            <option value="">{builtIn ? "Or one of ours" : "Or pick one of ours"}</option>
            {covers.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          {!builtIn && value ? (
            <button type="button" className="ad__btn adCover__clear" onClick={() => setValue(covers[0]?.value ?? "")}>
              <X aria-hidden="true" /> Use one of ours instead
            </button>
          ) : null}
        </div>
      </div>
      {state.error ? <small className="ad__fe" role="alert">{state.error}</small> : null}
      {err ? <small className="ad__fe" role="alert">{err}</small> : null}
      <small className="ad__fh">A wide photo, at least 1600px across. It is resized and compressed for each screen, so upload the best copy you have.</small>
    </div>
  );
}
