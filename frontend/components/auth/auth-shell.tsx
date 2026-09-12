import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import "@/app/login/login.css";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return <main className="au">
    <section className="au__brand" aria-label="We Dig Creativity">
      <div className="au__photo" aria-hidden="true" /><div className="au__wash" aria-hidden="true" />
      <Link href="/" className="au__logo" aria-label="Back to the WDC website"><Logo tone="white" markClassName="h-11 w-auto" /></Link>
      <blockquote><p>&ldquo;One team from the first idea to the finished system.&rdquo;</p><footer>WDC Solutions · Brilliant simplicity of thought</footer></blockquote>
    </section>
    <section className="au__panel"><div className="au__inner"><Link href="/" className="au__back"><ArrowLeft aria-hidden="true" /> Back to site</Link>{children}</div></section>
  </main>;
}
