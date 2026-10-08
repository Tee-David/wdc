"use client";
import { useEffect } from "react";
import "@/components/admin/admin.css";
import { DesignEditor } from "@/components/admin/email/design-editor";
import { EMAIL_KINDS } from "@/lib/email-registry";
import { ToastHost } from "@/components/admin/toast";

export default function Scratch() {
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    document.documentElement.classList.toggle("dark", q.get("theme") === "dark");
  }, []);
  const k = EMAIL_KINDS.find((x) => x.key === "project-stage")!;
  return (
    <div className="ad" style={{ padding: 16, minHeight: "100vh", background: "var(--ad-bg)" }}>
      <DesignEditor kind={k.key} name={k.name} tags={k.tags} starters={k.starters} saved={null} history={[{ id: "1", savedBy: "Owner", savedAt: new Date().toISOString() }]} />
      <ToastHost />
    </div>
  );
}
