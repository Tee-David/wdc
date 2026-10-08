"use client";

import dynamic from "next/dynamic";
import type { BuilderProps } from "./email-builder";
import "./design-editor.css";

/**
 * THE EMAIL BUILDER'S DOOR. The builder itself (TipTap, the drag and drop, the
 * side panel) is a separate chunk that loads only when this page is opened, so
 * it is not part of the admin's main bundle. Until it arrives the page shows a
 * quiet frame of the same shape, so nothing jumps.
 */
const EmailBuilder = dynamic(() => import("./email-builder"), {
  ssr: false,
  loading: () => <div className="ebLoad" role="status" aria-busy="true"><span className="ad__sr">Loading the email builder</span></div>,
});

export function DesignEditor(props: BuilderProps) {
  return <EmailBuilder {...props} />;
}
