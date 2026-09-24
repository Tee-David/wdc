import type { Viewport } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import LoginExperience from "@/components/auth/login-experience";
import { auth } from "@/lib/auth";
import { safeDestination } from "@/lib/roles";

/* `viewport-fit=cover`, so the band and the sheet can reach the edges of a
   notched phone and pad themselves with the safe-area insets instead. */
export const authViewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export type AuthQuery = { redirect?: string | string[]; error?: string | string[]; done?: string | string[] };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

/**
 * /login and /forgot-password are one page opened at two different steps.
 *
 * The query is read HERE, on the server, and handed down, never read with a
 * client hook: a client hook makes the form dynamic and puts it behind a
 * Suspense boundary, and that boundary is what once left /forgot-password
 * with no form in its server response at all.
 */
export async function LoginRoute({ query, initialStep }: { query: Promise<AuthQuery>; initialStep: "identify" | "reset" }) {
  const [session, params] = await Promise.all([auth.api.getSession({ headers: await headers() }), query]);
  const requested = first(params.redirect);
  let completed: { destination: string; name: string | null } | null = null;

  if (session?.user) {
    const role = (session.user as typeof session.user & { role?: string }).role;
    /* Back from an emailed link or from Google: stay for the closing moment,
       then /signed-in decides where this person belongs. Anything else that
       lands a signed-in person here (a restored tab, a bookmark) is sent on
       without a form asking them to do what they have already done. */
    if (first(params.done) === "1") {
      completed = {
        destination: requested ? `/signed-in?redirect=${encodeURIComponent(requested)}` : "/signed-in",
        name: session.user.name?.trim().split(/\s+/)[0] || null,
      };
    } else if (initialStep === "identify") {
      redirect(safeDestination(requested, role));
    }
  }

  const demo = process.env.NEXT_PUBLIC_AUTH_DEMO === "true";

  return (
    <AuthShell demo={demo}>
      <LoginExperience
        demo={demo}
        googleEnabled={Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)}
        requested={requested}
        refused={completed ? "" : first(params.error)}
        initialStep={initialStep}
        sender={process.env.SMTP_FROM_EMAIL?.trim() || "no-reply@wedigcreativity.com.ng"}
        completed={completed}
      />
    </AuthShell>
  );
}
