import type { Metadata } from "next";
import { authViewport, LoginRoute, type AuthQuery } from "@/components/auth/login-route";

export const metadata: Metadata = {
  /* NOT "Admin login". The same door serves the studio, clients and, later,
     the Academy; calling it the admin login told most of the people who use
     it that they were in the wrong place. */
  title: "Log in",
  robots: { index: false, follow: false },
};

export const viewport = authViewport;

export default function LoginPage({ searchParams }: { searchParams: Promise<AuthQuery> }) {
  return <LoginRoute query={searchParams} initialStep="identify" />;
}
