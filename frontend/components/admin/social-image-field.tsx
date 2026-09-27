"use client";

import { useRef, useState } from "react";
import { Image as ImageIcon, Images, Undo2 } from "lucide-react";
import { MediaPicker } from "./media-picker";
import { useFieldError } from "./form";

/**
 * THE POST'S SOCIAL IMAGE: the drawn card with the headline (the default,
 * and usually the better preview), the post's own cover, or any picture in
 * the media library. Posts as `socialImage`; the server accepts only the
 * site's covers or an address in our own bucket.
 */
export function SocialImageField({ defaultValue }: { defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const err = useFieldError("socialImage");
  const useCover = () => {
    const cover = box.current?.closest("form")?.querySelector<HTMLInputElement>('input[name="cover"]')?.value;
    if (cover) setValue(cover);
  };
  return (
    <div ref={box} className={`ad__f adSocial${err ? " is-bad" : ""}`}>
      <span className="ad__fl" id="social-label">Social image</span>
      <input type="hidden" name="socialImage" value={value} />
      <div className="adSocial__now" aria-labelledby="social-label">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- a library or cover picture at its own address
          <img src={value} alt="The picture a shared link to this post shows" />
        ) : (
          <span className="adSocial__card"><ImageIcon aria-hidden="true" /> The drawn card with the headline</span>
        )}
      </div>
      <div className="adSocial__acts">
        <button type="button" className="ad__btn" onClick={useCover}>Use the cover</button>
        <button type="button" className="ad__btn" onClick={() => setOpen(true)}><Images aria-hidden="true" /> Choose from library</button>
        {value ? <button type="button" className="ad__btn" onClick={() => setValue("")}><Undo2 aria-hidden="true" /> Use the drawn card</button> : null}
      </div>
      <small className="ad__fh">The drawn card is recommended: it carries the headline, which a photograph does not.</small>
      {err ? <small className="ad__fe" role="alert">{err}</small> : null}
      <MediaPicker open={open} onClose={() => setOpen(false)} kind="image" title="Choose the social image"
        onPick={(p) => { setValue(p.url); setOpen(false); }} />
    </div>
  );
}
