"use client";

import dynamic from "next/dynamic";
import { useGreetingState } from "@/components/auth/stage/stage-context";

/* The drawing, its 36 greetings and the handwriting face arrive after first
   paint. Until then the reserved box is empty, at its final size. */
const GreetingArt = dynamic(() => import("./greeting-art"), { ssr: false });

/**
 * Where the greeting lives, at a fixed size so nothing moves when it arrives.
 *
 * The drawing is `aria-hidden` and the cycle is never announced: one
 * visually hidden line says "Welcome", or "Welcome back, Tee" once it knows.
 */
export function GreetingSlot() {
  const { name, line } = useGreetingState();
  return (
    <div className="greet">
      <span className="sr-only">{name ? `Welcome back, ${name}` : "Welcome"}</span>
      <div className="greet__box" aria-hidden="true">
        <GreetingArt />
      </div>
      <span className="greet__line" aria-hidden="true">{line}</span>
    </div>
  );
}
