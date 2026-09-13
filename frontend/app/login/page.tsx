import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { AuthShell } from "@/components/auth/auth-shell";
import LoginForm from "@/components/auth/login-form";
import { auth } from "@/lib/auth";
import { homeFor } from "@/lib/roles";
import "./login.css";

export const metadata: Metadata = {
  /* NOT "Admin login". The same door serves the studio, clients and, later,
     the Academy; calling it the admin login told most of the people who use
     it that they were in the wrong place. */
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user) {
    redirect(homeFor((session.user as typeof session.user & { role?: string }).role));
  }

  return (
    <AuthShell>
      <LoginForm
        googleEnabled={Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)}
      />
    </AuthShell>
  );
}
