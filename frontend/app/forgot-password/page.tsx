import type { Metadata } from "next";
import { authViewport, LoginRoute, type AuthQuery } from "@/components/auth/login-route";

/* NOT "Reset admin password", for the same reason /login is not "Admin login":
   this door serves the studio, clients and later the Academy. */
export const metadata: Metadata = { title: "Reset your password", robots: { index: false, follow: false } };

export const viewport = authViewport;

/**
 * The login page, opened on the back of the card. "Back to log in" flips it
 * over to the front, so an old bookmark or an emailed link to this address
 * lands in exactly the same place as "Forgot password?" does.
 */
export default function ForgotPasswordPage({ searchParams }: { searchParams: Promise<AuthQuery> }) {
  return <LoginRoute query={searchParams} initialStep="reset" />;
}
