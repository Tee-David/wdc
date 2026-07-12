import IntroAnimation from "@/components/intro/intro-animation";
import { Header } from "@/components/layout/header";
import { Hero } from "@/components/sections/hero";

export default function Home() {
  return (
    <>
      <IntroAnimation />
      <Header />
      <main className="flex-1">
        <Hero />

        {/* Placeholder for the next build phase (services, work, stats…) */}
        <section
          id="about"
          className="border-t border-line bg-surface/40 py-28 dark:bg-surface/20"
        >
          <div className="mx-auto max-w-[1280px] px-6 text-center lg:px-10">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-secondary">
              More coming soon
            </p>
            <h2 className="mx-auto mt-4 max-w-2xl font-heading text-3xl font-bold tracking-tight md:text-4xl">
              Services, case studies, and the work we&apos;re proud of land
              here next.
            </h2>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-10">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-4 px-6 text-sm text-muted md:flex-row lg:px-10">
          <p>
            © {new Date().getFullYear()} We Dig Creativity Solutions. All
            rights reserved.
          </p>
          <p className="font-heading font-semibold">
            Brilliant simplicity <span className="text-secondary">of thought.</span>
          </p>
        </div>
      </footer>
    </>
  );
}
