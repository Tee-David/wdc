import { STAGES, type Stage } from "./types";

/**
 * WHAT EACH SERVICE CALLS ITS STAGES. The stored stage is still one of the six
 * shared STAGES (reports, filters and the board group by it); only the words a
 * person reads change, so a branding project says "Concepts" and an app says
 * "Testing" without a second stage field to keep in step.
 */
const NAMES: Record<string, [string, string, string, string, string, string]> = {
  branding: ["Onboarding", "Discovery call", "Concepts", "Client review", "Revisions", "Final files"],
  social: ["Onboarding", "Strategy", "Creating", "Client review", "Changes", "Live"],
  web: ["Onboarding", "Discovery", "Design and build", "Client review", "Fixes", "Launched"],
  apps: ["Onboarding", "Discovery", "Build", "Testing", "Fixes", "Released"],
  software: ["Onboarding", "Discovery", "Build", "Acceptance testing", "Changes", "Released"],
  seo: ["Onboarding", "Audit", "Fixes and content", "Client review", "Changes", "Reported"],
  ads: ["Onboarding", "Brief", "Creatives", "Client review", "Changes", "Live"],
};

export function stageNames(service: string): string[] {
  return NAMES[service] ?? [...STAGES];
}
export function stageName(service: string, stage: Stage): string {
  const i = STAGES.indexOf(stage);
  return i < 0 ? stage : stageNames(service)[i];
}
