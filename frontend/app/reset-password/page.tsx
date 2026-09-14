import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/password-flow";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false, follow: false } };

/**
 * The token is read here, not in the browser.
 *
 * Better Auth checks the emailed token server-side and redirects here with it
 * on the query, so this page is always reached with a real query string.
 * Reading it on the server means the form is in the first response rather than
 * behind a Suspense boundary that rendered nothing at all -- see
 * components/auth/password-flow.tsx.
 */
const first = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) ?? "";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[]; error?: string | string[] }>;
}) {
  const query = await searchParams;
  return (
    <AuthShell>
      <ResetPasswordForm token={first(query.token)} invalid={Boolean(first(query.error))} />
    </AuthShell>
  );
}
