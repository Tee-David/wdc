"use client";
import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { SUPPORT_EXIT, SUPPORT_READ_ONLY } from "@/lib/users/support-policy";
import { toast } from "./toast";

/** Ends the support view the way the bar's own button does: a real POST form, so it works with scripts still loading. */
export function exitSupportView() {
  const form = document.createElement("form");
  form.method = "post";
  form.action = SUPPORT_EXIT;
  form.setAttribute("data-support-exit", "");
  document.body.append(form);
  form.submit();
}

const isActionRequest = (init?: RequestInit, input?: RequestInfo | URL) => {
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  if (method !== "POST") return false;
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
  return headers.has("next-action");
};

/**
 * THE READ-ONLY NET. The proxy already refuses every write while a support
 * view is open (lib/users/support-policy.ts), so a save can never land; what
 * this adds is the explanation. Without it a refused server action is a
 * network error and a form that quietly does nothing. Forms that write are
 * stopped before React sees them and answer with the same words the server
 * uses; anything that calls an action outside a form is caught at fetch.
 * Search and filter forms (GET) and the Exit form pass untouched.
 */
function useReadOnlyNet(on: boolean) {
  useEffect(() => {
    if (!on) return;
    const submit = (event: SubmitEvent) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || form.hasAttribute("data-support-exit")) return;
      const method = (form.getAttribute("method") || "get").toLowerCase();
      const action = form.getAttribute("action") || "";
      if (method !== "post" && !action.startsWith("javascript:")) return;
      event.preventDefault();
      event.stopPropagation();
      toast(SUPPORT_READ_ONLY, "bad");
    };
    const realFetch = window.fetch;
    window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
      if (isActionRequest(init, input)) {
        toast(SUPPORT_READ_ONLY, "bad");
        return Promise.reject(new Error(SUPPORT_READ_ONLY));
      }
      return realFetch.call(window, input, init);
    } as typeof window.fetch;
    document.addEventListener("submit", submit, true);
    return () => { document.removeEventListener("submit", submit, true); window.fetch = realFetch; };
  }, [on]);
}

const left = (expiresAt: string) => Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 60_000));

/**
 * The bar across the top of EVERY admin page while the owner views the admin
 * as a staff member. Solid fill (--ad-fill with --ad-on-fill, 4.5:1 or better
 * in both themes), and the Exit button inverts the pair so it keeps its edge.
 * `minutes` is rendered on the server and then kept honest here, so the first
 * paint matches the markup the server sent.
 */
export default function SupportBar({ name, expiresAt, minutes }: { name?: string; expiresAt?: string; minutes?: number }) {
  const live = Boolean(name && expiresAt);
  const [mins, setMins] = useState(minutes ?? 0);
  useReadOnlyNet(live);
  useEffect(() => {
    /* The proxy sends a refused page request back to the dashboard with this flag; say why, once. */
    if (!live) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("notice") !== "support-read-only") return;
    toast("That page is not part of this read-only view.", "bad");
    url.searchParams.delete("notice");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }, [live]);
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => setMins(left(expiresAt));
    const every = window.setInterval(tick, 20_000);
    // A beat after expiry, so the browser has dropped the cookie: the reload lands on the owner's own session.
    const end = window.setTimeout(() => window.location.reload(), Math.max(0, new Date(expiresAt).getTime() - Date.now()) + 1500);
    return () => { window.clearInterval(every); window.clearTimeout(end); };
  }, [expiresAt]);
  return (
    <aside className="adSupport" aria-label="Support view">
      <Eye aria-hidden="true" />
      <div className="adSupport__text">
        {live ? <>
          <strong>Viewing as {name} (staff). Read-only. Expires in {mins} min.</strong>
          <span>Changes are off in this view. Your owner account stays signed in.</span>
        </> : <>
          <strong>Support view ended</strong>
          <span>This view ended or could not be verified. Exit to return to your own account.</span>
        </>}
      </div>
      <form action={SUPPORT_EXIT} method="post" data-support-exit="">
        <button className="adSupport__exit" type="submit">Exit support view</button>
      </form>
    </aside>
  );
}
