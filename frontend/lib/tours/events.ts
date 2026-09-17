/**
 * The privacy-safe tour events section 5.3 asks for: started, step reached,
 * skipped, completed, replayed -- with the tour id, its version, the
 * session's role, and the page, and nothing else. Never a field value,
 * never a client name, never anything the step's own target happened to be
 * sitting next to.
 *
 * NOWHERE TO SEND THEM YET. This site has no analytics or event pipeline of
 * its own -- there is no destination to wire this into today, and inventing
 * one for a tour would be building the wrong thing first. `emit` is the one
 * seam: every call site that would fire a tour event already goes through
 * it, so plugging in a real sink later is a one-line change here, not an
 * audit of every place a tour might end. Until then it logs in development
 * only, which is how this was actually verified -- watched in a browser
 * console rather than assumed to fire.
 */

export type TourEventName = "started" | "step_reached" | "skipped" | "completed" | "replayed";

export type TourEvent = {
  name: TourEventName;
  tourId: string;
  tourVersion: number;
  role: string;
  /** The pathname the event happened on, not the step's own target -- the
   *  page is the useful dimension for "where do people give up", the DOM
   *  selector is not. */
  page: string;
  /** Present only for `step_reached`. */
  stepId?: string;
  stepIndex?: number;
  stepCount?: number;
};

export function emit(event: TourEvent) {
  if (process.env.NODE_ENV !== "production") {
    console.info("[tour]", event);
  }
}
