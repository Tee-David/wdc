import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/pool";
import { SERVICES, type ServiceSlug } from "@/lib/services";

export type OnboardingAnswers = Record<string, string | string[]>;
export type OnboardingDraft = {
  id: string;
  service: ServiceSlug;
  status: "in_progress" | "submitted" | "archived";
  currentStep: number;
  answers: OnboardingAnswers;
  email: string | null;
  expiresAt: string;
};

export const ONBOARDING_COOKIE = "wdc_onboarding";
export const RESUME_TTL_SECONDS = 3 * 24 * 60 * 60;
const SERVICE_SLUGS = new Set(SERVICES.map((service) => service.slug));

export function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function issueToken() {
  return randomBytes(32).toString("base64url");
}

export function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 320 ? email : null;
}

export function cleanService(value: unknown): ServiceSlug | null {
  return typeof value === "string" && SERVICE_SLUGS.has(value as ServiceSlug)
    ? value as ServiceSlug
    : null;
}

export function cleanStep(value: unknown) {
  return typeof value === "number" && Number.isInteger(value)
    ? Math.max(0, Math.min(4, value))
    : 0;
}

export function cleanAnswers(value: unknown): OnboardingAnswers | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value);
  if (entries.length > 120) return null;

  const clean: OnboardingAnswers = {};
  let total = 0;
  for (const [key, answer] of entries) {
    if (!/^[a-z0-9_]{1,80}$/.test(key)) return null;
    if (typeof answer === "string") {
      const text = answer.slice(0, 10_000);
      total += text.length;
      clean[key] = text;
    } else if (Array.isArray(answer) && answer.length <= 50 && answer.every((item) => typeof item === "string")) {
      const list = answer.map((item) => item.slice(0, 500));
      total += list.reduce((sum, item) => sum + item.length, 0);
      clean[key] = list;
    } else {
      return null;
    }
    if (total > 100_000) return null;
  }
  return clean;
}

/**
 * FAILS CLOSED ON A MISSING ORIGIN, which it did not used to.
 *
 * `if (!origin) return true` looks harmless and is the whole hole: a browser
 * on another site always sends the header, so the check did stop the ordinary
 * cross-site case, but a script is under no obligation to send one at all and
 * was therefore waved straight through. Since every caller of these routes is
 * our own `fetch`, and browsers send `Origin` on cross-origin and same-origin
 * POSTs alike, requiring it costs a real client nothing.
 */
export function requestOriginIsAllowed(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const allowed = new Set([
    request.nextUrl.origin,
    process.env.BETTER_AUTH_URL,
    "https://wedigcreativity.com.ng",
    "https://www.wedigcreativity.com.ng",
  ].filter(Boolean));
  return allowed.has(origin);
}

export function setOnboardingCookie(response: NextResponse, token: string) {
  response.cookies.set(ONBOARDING_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: RESUME_TTL_SECONDS,
  });
}

export function clearOnboardingCookie(response: NextResponse) {
  response.cookies.set(ONBOARDING_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function draftFromToken(token: string): Promise<OnboardingDraft | null> {
  if (!/^[A-Za-z0-9_-]{40,80}$/.test(token)) return null;
  const result = await db.query<{
    id: string; service: ServiceSlug; status: OnboardingDraft["status"];
    current_step: number; answers: OnboardingAnswers; email: string | null; expires_at: Date;
  }>(`
    SELECT s.id, s.service, s.status, s.current_step, s.answers, s.email, t.expires_at
    FROM onboarding_resume_tokens AS t
    JOIN onboarding_submissions AS s ON s.id = t.submission_id
    WHERE t.token_hash = $1
      AND t.revoked_at IS NULL
      AND t.expires_at > now()
    LIMIT 1
  `, [tokenHash(token)]);
  const row = result.rows[0];
  return row ? {
    id: row.id,
    service: row.service,
    status: row.status,
    currentStep: row.current_step,
    answers: row.answers ?? {},
    email: row.email,
    expiresAt: row.expires_at.toISOString(),
  } : null;
}

export function cookieToken(request: NextRequest) {
  return request.cookies.get(ONBOARDING_COOKIE)?.value ?? null;
}
