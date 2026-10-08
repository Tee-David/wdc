"use client";

import { ArrowRight, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { finishStaffWelcome } from "@/lib/admin/staff-welcome-actions";
import { Actions, Form, Hidden, Submit } from "./form";

/** The two ways out of the welcome, and the theme choice on the way. */
export function StaffWelcomeActions() {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  return (
    <div className="ad__stack">
      <button type="button" className="ad__btn" onClick={() => setTheme(dark ? "light" : "dark")}>
        {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />} {dark ? "Switch to the light theme" : "Switch to the dark theme"}
      </button>
      <Actions>
        <Form action={finishStaffWelcome}><Hidden name="how" value="done" /><Submit icon={ArrowRight}>Take me to the dashboard</Submit></Form>
        <Form action={finishStaffWelcome}><Hidden name="how" value="skip" /><Submit tone="plain">Skip for now</Submit></Form>
      </Actions>
    </div>
  );
}
