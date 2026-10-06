"use client";

import { BrainCircuit, Code2, Megaphone, Palette, Search, Smartphone } from "lucide-react";
import { SERVICES, type ServiceSlug } from "@/lib/services";
import { PICKER_LINE } from "@/lib/onboarding";
import SelectField from "./select-field";
import "./brief-preferences.css";

const ICONS = { Palette, Search, Code2, Smartphone, BrainCircuit, Megaphone };

export default function ServicePicker({ value, onChange, closed, restored }: {
  value: ServiceSlug | null; onChange: (value: ServiceSlug) => void;
  closed: Partial<Record<ServiceSlug, string>>; restored: boolean;
}) {
  const unavailable = Object.fromEntries(SERVICES.map((service) => [service.short,
    restored && value === service.slug ? "" : closed[service.slug] || ""]));
  const selected = SERVICES.find((service) => service.slug === value);
  return <div className="obService">
    <label className="ob__label" htmlFor="ob-service">What are we working on for you?</label>
    <SelectField id="ob-service" options={SERVICES.map((service) => service.short)}
      placeholder="Choose the service this brief is for" value={selected?.short || ""}
      unavailable={unavailable} describedBy="ob-service-description"
      onChange={(name) => { const service = SERVICES.find((entry) => entry.short === name); if (service) onChange(service.slug); }}
      renderOption={(name) => {
        const service = SERVICES.find((entry) => entry.short === name)!;
        const Icon = ICONS[service.icon as keyof typeof ICONS];
        return <span className="obService__option"><span className="obService__icon" aria-hidden="true"><Icon /></span>
          <span><strong>{name}</strong><small>{unavailable[name] || PICKER_LINE[service.slug]}</small></span></span>;
      }} />
    <p className="ob__hint" id="ob-service-description">{selected ? PICKER_LINE[selected.slug] : "Choose one service. A separate brief keeps each project clear."}</p>
  </div>;
}
