"use client";

import { useCallback, useEffect, useState } from "react";
import type { ServiceSlug } from "@/lib/services";

type Answers = Record<string, string | string[]>;
type RestoredDraft = { service: ServiceSlug; currentStep: number; answers: Answers };
type SaveResult = { resumeUrl: string; emailSent: boolean };

class DraftError extends Error {
  constructor(message: string, readonly canReissue = false) { super(message); }
}

async function responseJson(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new DraftError(data.error || "The form could not be saved right now.", data.canReissue === true);
  return data;
}

/* ONE CLAIM PER LINK. A resume link works once, so a second request for the
   same token (React mounting the effect twice, or a remount) would spend
   nothing and be told the link was used. Both callers share the one answer. */
const claims = new Map<string, Promise<Response>>();
function claim(token: string) {
  let p = claims.get(token);
  if (!p) {
    p = fetch("/api/onboarding/resume", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    claims.set(token, p);
  }
  return p.then((r) => r.clone());
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
  /* TWO WAYS A RETURNING CLIENT USED TO BE LEFT AT A BLANK FORM: their link
     led to a brief they had already sent, or it had expired or been used.
     Each is now a state the form shows with its way forward. */
  const [alreadySent, setAlreadySent] = useState(false);
  const [canReissue, setCanReissue] = useState(false);

  useEffect(() => {
    let live = true;
    const restore = async () => {
      const url = new URL(window.location.href);
      const token = url.searchParams.get("resume");
      try {
        const response = token
          ? await claim(token)
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
        } else if (data.draft?.status === "submitted") {
          setAlreadySent(true);
        }
      } catch (error) {
        if (!live) return;
        setMessage(error instanceof Error ? error.message : "This saved form could not be restored.");
        if (error instanceof DraftError && error.canReissue) setCanReissue(true);
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

  /* Let go of the saved draft on the server as well as in this browser, so
     Start over (or "start a new brief" after one was sent) really starts over
     instead of autosaving into a brief that is already in. */
  const forget = useCallback(async () => {
    await fetch("/api/onboarding/draft", { method: "DELETE" }).catch(() => undefined);
    setAlreadySent(false);
    setCanReissue(false);
    setResumeUrl("");
    setMessage("");
  }, []);

  /* "Send me a new link": the reissue route answers the same whatever the
     address, and sends only to the address on the draft. */
  const reissue = useCallback(async (email: string) => {
    const r = await fetch("/api/onboarding/reissue", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }),
    }).then(async (x) => ({ ok: x.ok, body: await x.json().catch(() => ({})) })).catch(() => null);
    if (!r) return { ok: false, message: "That could not be sent. Check your connection and try again." };
    return { ok: r.ok, message: r.body.message ?? r.body.error ?? "That could not be sent just now." };
  }, []);

  return { ready, saving, submitting, resumeUrl, message, setMessage, save, submit, alreadySent, canReissue, forget, reissue };
}
