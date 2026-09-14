"use client";

import { useEffect, useRef, useState } from "react";
import CurvedInput from "@/components/ui/curved-input";

import "./newsletter.css";

/**
 * The footer subscribe box.
 *
 * THE BAR IS THE CURVED INPUT, which is a striking thing to put in a footer
 * and worth being honest about: it is an SVG, and the visible text is drawn on
 * a path rather than typed into a box. That costs nothing a visitor can feel --
 * the real `<input>` underneath holds the value, the focus and the caret, so
 * the keyboard, autofill, paste and screen readers all work normally -- but it
 * is the reason this file cares about measurement.
 *
 * THE CURVE IS SIZED FROM THE MEASURED WIDTH, not fixed. `bend` is a sagitta
 * in pixels: 28px of arch across 640px is a gentle bow, and the same 28px
 * across 300px is a banana. The component cannot do this itself because its
 * bend is a prop, so the proportion is worked out here and the bar keeps the
 * same shape at every width instead of the same number.
 *
 * WHAT HAPPENS ON SUBMIT, in order: the field locks, the request goes, and the
 * answer replaces the bar with a line of text. The lock matters -- a second
 * press while the first is in flight is a duplicate row at the other end, and
 * a footer button is exactly the kind people press twice.
 */

/* The arch as a FRACTION of the width, then clamped. Below the floor the curve
   stops reading as deliberate and looks like a rendering fault; above the
   ceiling the text at the ends tips far enough to be harder to read than it is
   pretty. Both numbers were set by looking at it at 320, 390 and 1280. */
const BEND_RATIO = 0.045;
const BEND_MIN = 8;
const BEND_MAX = 26;

type State =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "done" }
  | { kind: "error"; message: string };

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const [width, setWidth] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  /* The honeypot's value. A real visitor never sees this field, so anything in
     it came from something filling every input on the page. */
  const trap = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width ?? el.clientWidth;
      setWidth(Math.round(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const bend = Math.round(Math.min(BEND_MAX, Math.max(BEND_MIN, width * BEND_RATIO)));
  /* The bar itself shrinks too, or a 64px pill with 16px type looks pasted on
     at 320px. Below 420 the button label is the first thing to run out of
     room, so the type steps down with the bar. */
  const compact = width > 0 && width < 420;
  const height = compact ? 54 : 64;
  const fontSize = compact ? 14 : 16;

  async function send(value: string) {
    const address = value.trim();
    if (!address) {
      setState({ kind: "error", message: "Enter your email address first." });
      return;
    }
    setState({ kind: "busy" });
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: address,
          source: "footer",
          company: trap.current?.value ?? "",
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setState({
          kind: "error",
          message: data.error || "That did not go through. Please try again.",
        });
        return;
      }
      setState({ kind: "done" });
      setEmail("");
    } catch {
      /* A network failure, not a refusal. Saying "check your connection" is
         the useful half; saying "try again" without it sends people back to
         press the same button on the same dead link. */
      setState({
        kind: "error",
        message: "No connection. Check your network and try again.",
      });
    }
  }

  return (
    <div className="nl">
      <div className="nl__say">
        <h2>Worth your inbox.</h2>
        <p>
          Work we have shipped, what it cost, and what we learned. Sent when
          there is something to say, which is not every week.
        </p>
      </div>

      <div className="nl__box" ref={box}>
        {state.kind === "done" ? (
          /* THE ANSWER TAKES THE BAR'S PLACE rather than appearing under it.
             A message added below moves the closing rule and the copyright
             line down at the moment somebody is reading, on the part of the
             page most likely to be near the bottom of their screen. */
          <p className="nl__done" role="status">
            <span aria-hidden="true" className="nl__tick" />
            You are on the list. Check your inbox for a note confirming it.
          </p>
        ) : (
          <>
            <CurvedInput
              width="100%"
              bend={bend}
              height={height}
              fontSize={fontSize}
              cornerRadius={compact ? 15 : 18}
              borderWidth={1.5}
              type="email"
              name="email"
              value={email}
              onChange={(next) => {
                setEmail(next);
                /* The error clears as soon as they start fixing it. Leaving it
                   up while somebody retypes is the form arguing with them. */
                if (state.kind === "error") setState({ kind: "idle" });
              }}
              onSubmit={send}
              busy={state.kind === "busy"}
              placeholder="you@company.com"
              buttonText={state.kind === "busy" ? "Sending" : "Subscribe"}
              ariaLabel="Your email address, to subscribe to the newsletter"
              /* LITERAL COLOURS, AND TRANSLUCENT ONES ON PURPOSE. These are SVG
                 presentation attributes, and `var()` does not substitute into
                 one -- it only works in a CSS declaration. The footer card is
                 navy in both themes but not the SAME navy, so the surface and
                 the rule are white at low alpha: they sit correctly on either
                 without a second palette to keep in step.

                 THE BUTTON LABEL IS BLACK. White on #ff6500 measures 2.95:1
                 and fails even the 3:1 allowed for large text; black on it is
                 7.11:1. This is the site's rule, pinned by
                 tests/button-colours.spec.ts. */
              backgroundColor="rgba(255, 255, 255, 0.06)"
              borderColor="rgba(255, 255, 255, 0.20)"
              textColor="#ffffff"
              placeholderColor="rgba(238, 240, 255, 0.58)"
              buttonColor="#ff6500"
              buttonTextColor="#000000"
              iconColor="#ff6500"
              shadowSize="sm"
              shadowColor="#000018"
            />

            {/* Off screen rather than `display: none`: a field a bot cannot
                see in the layout but can read in the DOM is the point. */}
            <input
              ref={trap}
              className="nl__trap"
              type="text"
              name="company"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />

            {/* Reserved whether or not there is a message, so an error does
                not push the footer around as it appears. */}
            <p className="nl__note" role="status">
              {state.kind === "error" ? (
                <span className="nl__bad">{state.message}</span>
              ) : (
                "No more than once a month. Leave whenever you like."
              )}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default Newsletter;
