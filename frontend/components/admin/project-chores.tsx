"use client";

import { Pencil } from "lucide-react";
import type { Project } from "@/lib/admin/types";
import { ProjectDetailsForm } from "./delivery";
import { ProjectMenu } from "./row-actions";

/** The ⋮ in a project's head: edit its details, move it, set the date, note it, open the client, archive it. */
export function ProjectChores({ project, clientName }: { project: Project; clientName?: string }) {
  return (
    <ProjectMenu project={project} clientName={clientName} onProject
      extra={[{ kind: "dialog", label: "Edit details", icon: Pencil, title: "Project details", wide: true, render: (close) => <ProjectDetailsForm project={project} close={close} /> }]} />
  );
}
