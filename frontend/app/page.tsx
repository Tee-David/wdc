import IntroAnimation from "@/components/intro/intro-animation";
import { Header } from "@/components/layout/header";
import { About } from "@/components/sections/about";
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
        <About />
        <Services />
        <Testimonials />
      </main>

      {/* Top curve closes the alternation, riding over the Testimonials */}
      <footer className="relative z-10 -mt-10 rounded-t-[2.5rem] bg-background py-14 md:-mt-16 md:rounded-t-[4rem] lg:-mt-[5.5rem] lg:rounded-t-[5.5rem]">
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
