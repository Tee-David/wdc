import IntroAnimation from "@/components/intro/intro-animation";
import { Header } from "@/components/layout/header";
import { Hero } from "@/components/sections/hero";
import { Services } from "@/components/sections/services";
import { Testimonials } from "@/components/sections/testimonials";

export default function Home() {
  return (
    <>
      <IntroAnimation />
      <Header />
      <main className="flex-1">
        <Hero />
        <Services />
        <Testimonials />
      </main>

      <footer className="border-t border-line py-10">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-4 px-6 text-sm text-muted md:flex-row lg:px-10">
          <p>
            © {new Date().getFullYear()} We Dig Creativity Solutions. All
            rights reserved.
          </p>
          <p className="font-heading font-semibold">
            ...brilliant simplicity <span className="text-secondary">of thought!</span>
          </p>
        </div>
      </footer>
    </>
  );
}
