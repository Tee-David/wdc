"use client";

import { MessageSquare } from "lucide-react";
import { DialogButton } from "./dialog";
import { Actions, Area, Fields, Form, Select, Submit } from "./form";
import { askAdmin } from "@/lib/messages/actions";

/** Ask Admin (staff Support): the question goes into your direct chat with Admin, and the chat opens. */
export function AskAdmin({ about, primary = true, startOpen = false }: { about: string[]; primary?: boolean; startOpen?: boolean }) {
  return (
    <DialogButton label="Ask Admin" title="Ask Admin" icon={MessageSquare} tone={primary ? "primary" : "plain"} startOpen={startOpen}>
      {() => (
        <Form action={askAdmin}>
          <p className="ad__dim" style={{ margin: "0 0 1rem" }}>Use this for something Admin needs to decide or fix. It goes into your chat with Admin, so the answer lands in Messages.</p>
          <Fields>
            <Select name="kind" label="What is it" half defaultValue="Question" options={["Question", "Problem", "Request"].map((k) => ({ value: k, label: k }))} />
            <Select name="about" label="About" half defaultValue="The studio" options={["The studio", ...about].map((a) => ({ value: a, label: a }))} />
            <Area name="body" label="Your question" rows={5} placeholder="For example: Which budget are we offering Lumen?" />
          </Fields>
          <Actions><Submit>Send to Admin</Submit></Actions>
        </Form>
      )}
    </DialogButton>
  );
}
