import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/password-flow";
export const metadata: Metadata = { title: "Choose a new password", robots: { index: false, follow: false } };
export default function ResetPasswordPage() { return <AuthShell><Suspense><ResetPasswordForm /></Suspense></AuthShell>; }
