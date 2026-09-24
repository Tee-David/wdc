"use client";

import { useEffect, useRef, useState } from "react";
import CurvedInput from "@/components/ui/curved-input";
import CurvedNote from "@/components/ui/curved-note";

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
   pretty. All three numbers were set by looking at it at 320, 390 and 1280.

   RAISED FROM 0.045 / 8 / 26 on request: the bow was too shy to read as a
   decision. The helper line underneath follows the same arc automatically,
   because it is drawn from this same number rather than from one of its own. */
const BEND_RATIO = 0.062;
const BEND_MIN = 10;
const BEND_MAX = 34;

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

  /* CURVED ON A PHONE ONLY. Beside the footer's straight menu columns on a
     wider screen the arch read as a tilt rather than a flourish; on a phone
     the box has the width to itself and the curve matches the pitch above it.
     Straight until the query answers, which is also what the server draws. */
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 560px)");
    const update = () => setPhone(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

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

  const bend = phone ? Math.round(Math.min(BEND_MAX, Math.max(BEND_MIN, width * BEND_RATIO))) : 0;
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
    <div className="nl ft__nl">
      {/* NO HEADING AND NO PITCH. The box now sits inside the footer's own
          columns rather than in a band of its own, where a display-sized
          "Worth your inbox." was a second headline competing with the four
          column titles beside it. The field's placeholder and the line under
          it already say what this is and how often it sends. */}
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

                 THE BUTTON IS THE SITE'S PRIMARY ON A DARK GROUND: white fill,
                 black label, at 21:1 -- the pair inverted, as AGENTS.md sets for
                 the navy band. It was black on white, which is the paper
                 version of the pair. The hover swaps to black with a white
                 label, so it trades places like every other primary. */
              backgroundColor="rgba(255, 255, 255, 0.06)"
              borderColor="rgba(255, 255, 255, 0.20)"
              textColor="#ffffff"
              placeholderColor="rgba(238, 240, 255, 0.58)"
              buttonColor="#ffffff"
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
                not push the footer around as it appears.

                THE STANDING LINE IS BENT ALONG THE BAR'S OWN ARC, passed the
                same width, bend, height and border width the bar above it got,
                so the two are one circle rather than two that were eyeballed
                into agreement. It shrinks to fit and falls back to ordinary
                wrapped text in a column too narrow for one line.

                THE ERROR IS NOT BENT, deliberately. Its length changes at
                runtime, it is longer than the standing line, and it is the one
                sentence here that has to be read and acted on rather than
                admired. Text on a path cannot wrap, so curving it would be
                choosing prettiness at the exact moment something has gone
                wrong. */}
            <div className="nl__note" role="status">
              {state.kind === "error" ? (
                <span className="nl__bad">{state.message}</span>
              ) : (
                <CurvedNote
                  text="No more than once a month. Leave whenever you like."
                  width={width}
                  bend={bend}
                  height={height}
                  borderWidth={1.5}
                  /* The same size the straight version was, in both cases.
                     The component measures and steps down on its own when a
                     column cannot hold the sentence, so hard-coding a smaller
                     one for narrow screens only shrank it twice. */
                  fontSize={13}
                  color="rgb(238 240 255 / .58)"
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Newsletter;
