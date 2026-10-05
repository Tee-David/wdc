"use client";
import { Radios } from "../form";
import { SettingsForm } from "./kit";
import { securityEmailPreference } from "@/lib/users/preference-actions";
export function SecurityEmailForm({ enabled }: { enabled: boolean }) {
  return <SettingsForm action={securityEmailPreference}><p>Account-change emails tell you when a studio owner changes your name, access or sessions. Sign-in and recovery messages you request remain available.</p><Radios name="enabled" label="Account-change emails" defaultValue={enabled ? "yes" : "no"} options={[{ value: "yes", label: "Email me" }, { value: "no", label: "Do not email me" }]} /></SettingsForm>;
}
