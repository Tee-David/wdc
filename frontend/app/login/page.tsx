import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { AuthShell } from "@/components/auth/auth-shell";
import LoginForm from "@/components/auth/login-form";
import { auth } from "@/lib/auth";
import { safeDestination } from "@/lib/roles";
import "./login.css";

export const metadata: Metadata = {
  /* NOT "Admin login". The same door serves the studio, clients and, later,
     the Academy; calling it the admin login told most of the people who use
     it that they were in the wrong place. */
  title: "Sign in",
  robots: { index: false, follow: false },
};

const first = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) ?? "";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string | string[]; error?: string | string[] }>;
}) {
  const [session, query] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    searchParams,
  ]);
  const requested = first(query.redirect);

  if (session?.user) {
    /* Already signed in and back on the login page -- usually the browser
       restoring a tab, or a bookmarked /login. Send them where they were
       going, not to a form asking them to do what they have already done. */
    redirect(safeDestination(requested, (session.user as typeof session.user & { role?: string }).role));
  }

  return (
    <AuthShell>
      <LoginForm
        googleEnabled={Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)}
        requested={requested}
        refused={first(query.error)}
      />
    </AuthShell>
  );
}
