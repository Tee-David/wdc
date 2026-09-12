"use client";

import { useCallback, useEffect, useState } from "react";
import type { ServiceSlug } from "@/lib/services";

type Answers = Record<string, string | string[]>;
type RestoredDraft = { service: ServiceSlug; currentStep: number; answers: Answers };
type SaveResult = { resumeUrl: string; emailSent: boolean };

async function responseJson(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "The form could not be saved right now.");
  return data;
}

export function useServerDraft(input: {
  started: boolean;
  service: ServiceSlug;
  currentStep: number;
  answers: Answers;
  onRestore: (draft: RestoredDraft) => void;
}) {
  const { started, service, currentStep, answers, onRestore } = input;
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resumeUrl, setResumeUrl] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let live = true;
    const restore = async () => {
      const url = new URL(window.location.href);
      const token = url.searchParams.get("resume");
      try {
        const response = token
          ? await fetch("/api/onboarding/resume", {
              method: "POST", headers: { "content-type": "application/json" },
              body: JSON.stringify({ token }),
            })
          : await fetch("/api/onboarding/draft", { cache: "no-store" });
        const data = await responseJson(response);
        if (!live) return;
        if (data.draft?.status === "in_progress") {
          onRestore({
            service: data.draft.service,
            currentStep: data.draft.currentStep,
            answers: data.draft.answers ?? {},
          });
          setResumeUrl("");
          setMessage(token ? "Your saved answers are ready." : "");
        }
      } catch (error) {
        if (live) setMessage(error instanceof Error ? error.message : "This saved form could not be restored.");
      } finally {
        if (token) {
          url.searchParams.delete("resume");
          window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
        }
        if (live) setReady(true);
      }
    };
    void restore();
    return () => { live = false; };
  }, [onRestore]);

  const save = useCallback(async (options?: { email?: string; emailLink?: boolean; rotateLink?: boolean }): Promise<SaveResult> => {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/onboarding/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ service, currentStep, answers, ...options }),
      });
      const data = await responseJson(response);
      setResumeUrl(data.resumeUrl || "");
      return { resumeUrl: data.resumeUrl || "", emailSent: data.emailSent === true };
    } catch (error) {
      const text = error instanceof Error ? error.message : "The form could not be saved right now.";
      setMessage(text);
      throw error;
    } finally {
      setSaving(false);
    }
  }, [service, currentStep, answers]);

  useEffect(() => {
    if (!ready || !started) return;
    const timer = window.setTimeout(() => {
      void save().catch(() => undefined);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [ready, started, save]);

  const submit = useCallback(async () => {
    setSubmitting(true);
    setMessage("");
    try {
      await save();
      const response = await fetch("/api/onboarding/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ service, answers }),
      });
      return await responseJson(response);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The form could not be submitted right now.");
      throw error;
    } finally {
      setSubmitting(false);
    }
  }, [save, service, answers]);

  return { ready, saving, submitting, resumeUrl, message, setMessage, save, submit };
}
