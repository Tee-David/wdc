import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { headers } from "next/headers";
import { Logo } from "@/components/brand/logo";
import LoginForm from "@/components/auth/login-form";
import { auth } from "@/lib/auth";
import "./login.css";

export const metadata: Metadata = {
  title: "Admin login",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user && (session.user as typeof session.user & { role?: string }).role === "owner") redirect("/admin");

  return (
    <main className="au">
      <section className="au__brand" aria-label="We Dig Creativity">
        <div className="au__photo" aria-hidden="true" />
        <div className="au__wash" aria-hidden="true" />
        <Link href="/" className="au__logo" aria-label="Back to the WDC website">
          <Logo tone="white" markClassName="h-11 w-auto" />
        </Link>
        <blockquote>
          <p>&ldquo;One team from the first idea to the finished system.&rdquo;</p>
          <footer>WDC Solutions · Brilliant simplicity of thought</footer>
        </blockquote>
      </section>

      <section className="au__panel">
        <div className="au__inner">
          <Link href="/" className="au__back">
            <ArrowLeft aria-hidden="true" /> Back to site
          </Link>
          <LoginForm googleEnabled={Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)} />
        </div>
      </section>
    </main>
  );
}
