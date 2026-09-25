"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { createForm } from "@/lib/forms/custom-actions";
import { slugify } from "@/lib/forms/custom-def";
import { Actions, Fields, Form, Submit } from "@/components/admin/form";
import { Text } from "@/components/admin/settings/kit";

/** A name, and the address that follows it until somebody changes the address themselves. */
export function NewFormForm() {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [own, setOwn] = useState(false);
  return (
    <Form action={createForm}>
      <Fields>
        <div style={{ display: "contents" }} onInput={(e) => { const t = e.target as HTMLInputElement; if (t.name === "title") { setTitle(t.value); if (!own) setSlug(slugify(t.value)); } }}>
          <Text name="title" label="Name" required message="Give the form a name." placeholder="Event sign-up" />
        </div>
        <div style={{ display: "contents" }} onInput={(e) => { const t = e.target as HTMLInputElement; if (t.name === "slug") { setOwn(true); setSlug(t.value); } }}>
          <Text key={own ? "own" : slug} name="slug" label="Address" prefix="/f/" defaultValue={slug} required pattern="[a-z0-9-]{2,48}"
            message="Two or more small letters, numbers or dashes." placeholder={slugify(title) || "event-sign-up"} />
        </div>
      </Fields>
      <Actions><Submit icon={ArrowRight}>Create and add questions</Submit></Actions>
    </Form>
  );
}
