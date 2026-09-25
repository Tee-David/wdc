"use client";

import { Eye, EyeOff } from "lucide-react";
import { setCaseStudyHidden } from "@/lib/admin/work-actions";
import { Form, Hidden, Submit } from "./form";

/** Take a case study off the site, or put it back. Owner only; nothing is deleted. */
export function HideCase({ slug, client, hidden }: { slug: string; client: string; hidden: boolean }) {
  return (
    <Form action={setCaseStudyHidden} confirm={hidden ? undefined : `Take ${client} off the site? Nothing written is deleted, and you can put it back.`}>
      <Hidden name="slug" value={slug} />
      <Hidden name="hidden" value={hidden ? "0" : "1"} />
      <Submit tone="plain" icon={hidden ? Eye : EyeOff}>{hidden ? "Put back" : "Take off"}</Submit>
    </Form>
  );
}
