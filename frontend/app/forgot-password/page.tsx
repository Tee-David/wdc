import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/password-flow";

/* NOT "Reset admin password", for the same reason /login is not "Admin login":
   this door serves the studio, clients and later the Academy. */
export const metadata: Metadata = { title: "Reset your password", robots: { index: false, follow: false } };

/* No Suspense boundary, because there is nothing to suspend on any more. The
   form read the query with `useSearchParams()`, the boundary that required
   rendered empty on the server, and the page arrived with no form in it. */
export default function ForgotPasswordPage() {
  return <AuthShell><ForgotPasswordForm /></AuthShell>;
}
