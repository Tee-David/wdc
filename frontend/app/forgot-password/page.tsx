import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/password-flow";
export const metadata: Metadata = { title: "Reset admin password", robots: { index: false, follow: false } };
export default function ForgotPasswordPage() { return <AuthShell><Suspense><ForgotPasswordForm /></Suspense></AuthShell>; }
