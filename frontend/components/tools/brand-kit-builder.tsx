"use client";

import { useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Check, Download, ImageUp, Loader2, Upload, X } from "lucide-react";
import WaitingLine from "./waiting-line";

/**
 * The brand asset pack at /tools/brand-kit: a logo in, a palette, a contrast
 * grid and a favicon set out. See `lib/brand-kit.ts` for what runs on the
 * server and why nothing uploaded here is kept.
 */

type Result = {
  source: { width: number; height: number; format: string };
  palette: { hex: string; r: number; g: number; b: number; share: number }[];
  contrast: {
    hex: string;
    onWhite: { ratio: number; formatted: string; passesAA: boolean };
    onBlack: { ratio: number; formatted: string; passesAA: boolean };
  }[];
  favicons: { size: number; label: string; dataUrl: string }[];
};

const WAITING = [
  "Reading your logo 🖼️",
  "Picking out its colours 🎨",
  "Checking contrast against white and black ⚖️",
  "Rendering every favicon size 📐",
];

const MAX_MB = 8;

export default function BrandKitBuilder() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] ?? null;
    setError("");
    setResult(null);
    setFile(picked);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(picked ? URL.createObjectURL(picked) : "");
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.set("logo", file);
      const response = await fetch("/api/tools/brand-kit", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? "We could not read that logo just now.");
        setResult(null);
        return;
      }
      setResult(data as Result);
    } catch {
      setError("We could not reach the tool. Please try again in a moment.");
      setResult(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`tl bk${result ? " tl--split" : ""}`}>
      <form className="tl__form" onSubmit={submit}>
        <label className="tl__label" htmlFor="brand-kit-file">Your logo</label>
        <div
          className="bk__drop"
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- a transient, unoptimized preview of a file that never touches our storage
            <img src={preview} alt="" className="bk__thumb" />
          ) : (
            <ImageUp aria-hidden="true" className="bk__dropIcon" />
          )}
          <span className="bk__dropText">
            {file ? file.name : "Click to choose a file, or drag one here"}
          </span>
          <input
            ref={inputRef}
            id="brand-kit-file"
            className="bk__fileInput"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml"
            onChange={pick}
          />
        </div>
        <p className="tl__hint">
          PNG, JPEG, WebP, GIF, AVIF or SVG, up to {MAX_MB}MB. It is read to build
          this page and never saved anywhere.
        </p>
        <div className="tl__row">
          <button className="tl__go" type="submit" disabled={busy || !file}>
            {busy
              ? <><Loader2 className="tl__spin" aria-hidden="true" /> Building</>
              : <><Upload aria-hidden="true" /> Build the kit</>}
          </button>
        </div>
      </form>

      {error && <p className="tl__err" role="alert">{error}</p>}

      {busy && <WaitingLine phrases={WAITING} />}

      <div className="tl__out" aria-live="polite">
        {result && (
          <>
            <p className="tl__verdict">
              <Check aria-hidden="true" />
              <span>
                {result.palette.length} colour{result.palette.length === 1 ? "" : "s"} found,
                and {result.favicons.length} favicon sizes ready to download.
              </span>
            </p>

            <h3 className="es__h">Palette &amp; contrast</h3>
            <p className="tl__hint">
              Read straight off the file, most-used first. &ldquo;AA&rdquo; is
              whether this colour, used as text, clears WCAG AA on a plain white
              or black background -- the same maths as{" "}
              <a href="/tools/contrast">the contrast checker</a>, which also
              covers any two colours you choose yourself.
            </p>
            <ul className="bk__palette">
              {result.palette.map((swatch) => (
                <li className="bk__swatchRow" key={swatch.hex}>
                  <span className="bk__chip" style={{ background: swatch.hex }} aria-hidden="true" />
                  <span className="bk__swatchInfo">
                    <span className="bk__swatchHex">{swatch.hex}</span>
                    <span className="tl__hint">{Math.round(swatch.share * 100)}% of the image</span>
                  </span>
                  {(() => {
                    const row = result.contrast.find((c) => c.hex === swatch.hex);
                    if (!row) return null;
                    return (
                      <span className="bk__contrastPair">
                        <span className={row.onWhite.passesAA ? "is-pass" : "is-fail"}>
                          {row.onWhite.passesAA ? <Check aria-hidden="true" /> : <X aria-hidden="true" />}
                          {row.onWhite.formatted} on white
                        </span>
                        <span className={row.onBlack.passesAA ? "is-pass" : "is-fail"}>
                          {row.onBlack.passesAA ? <Check aria-hidden="true" /> : <X aria-hidden="true" />}
                          {row.onBlack.formatted} on black
                        </span>
                      </span>
                    );
                  })()}
                </li>
              ))}
            </ul>

            <h3 className="es__h">Favicon set</h3>
            <p className="tl__hint">
              Six sizes, transparent background, cropped to fit rather than
              stretched. Right-click and save, or use the download link on each.
            </p>
            <ul className="bk__favicons">
              {result.favicons.map((icon) => (
                <li className="bk__favicon" key={icon.size}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- a generated data: URL, not an optimizable asset */}
                  <img src={icon.dataUrl} alt="" width={icon.size >= 64 ? 64 : icon.size} height={icon.size >= 64 ? 64 : icon.size} />
                  <span className="bk__faviconLabel">{icon.size}&times;{icon.size}</span>
                  <span className="tl__hint">{icon.label}</span>
                  <a
                    className="bk__faviconDl"
                    href={icon.dataUrl}
                    download={`favicon-${icon.size}.png`}
                  >
                    <Download aria-hidden="true" /> Download
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
