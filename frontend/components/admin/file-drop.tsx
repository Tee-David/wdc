"use client";

import { useRef, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Loader2, UploadCloud } from "lucide-react";

type FileDropProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className" | "onChange"> & {
  label: ReactNode;
  hint: ReactNode;
  busy?: boolean;
  onFiles?: (files: FileList) => void;
};

/**
 * The admin version of the WDC file dropzone: one real file input fills the
 * dashed panel, so click, keyboard selection and an operating-system drop all
 * use the same native control. Upload policy and persistence stay with the
 * owning form; this component owns only the shared interaction and appearance.
 */
export function FileDrop({ id, label, hint, busy = false, onFiles, disabled, ...input }: FileDropProps) {
  const [over, setOver] = useState(false);
  const depth = useRef(0);
  const off = disabled || busy;

  return (
    <div className="ad__f adFileDropField">
      <span className="ad__fl" id={`${id}-label`}>{label}</span>
      <label
        className={`adFileDrop${over ? " is-over" : ""}${off ? " is-off" : ""}`}
        onDragEnter={() => { if (!off) { depth.current += 1; setOver(true); } }}
        onDragOver={(event) => { if (!off) event.preventDefault(); }}
        onDragLeave={() => { depth.current = Math.max(0, depth.current - 1); if (!depth.current) setOver(false); }}
        onDrop={() => { depth.current = 0; setOver(false); }}
      >
        <input
          {...input}
          id={id}
          type="file"
          disabled={off}
          aria-labelledby={`${id}-label ${id}-lead`}
          onChange={(event) => {
            if (event.currentTarget.files?.length && onFiles) {
              onFiles(event.currentTarget.files);
              event.currentTarget.value = "";
            }
          }}
        />
        {busy ? <Loader2 className="ad__spin" aria-hidden="true" /> : <UploadCloud aria-hidden="true" />}
        <span className="adFileDrop__lead" id={`${id}-lead`}>
          <b>{busy ? "Uploading" : "Choose files"}</b>{busy ? null : " or drag them here"}
        </span>
        <small>{hint}</small>
      </label>
    </div>
  );
}
