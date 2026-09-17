import { motion, useReducedMotion } from "motion/react";
import { ChevronLeft, Clock3, MousePointerClick, SkipForward, X } from "lucide-react";
import type { TooltipRenderProps } from "react-joyride";
import type { TourStepMeta } from "@/lib/tours/types";
import { TourIcon } from "./tour-icon";

/**
 * The tour's own tooltip card, built from `.ad__` primitives rather than
 * Joyride's built-in styling API -- see the note in `tour-runtime.tsx` for
 * why -- now carrying an animated header icon, a progress rail, an
 * up-front duration estimate and, on an interactive step, a "click this"
 * prompt with a pulsing dot. All computed once per tour start in
 * `lib/tours/meta.ts` and hung off `step.data`.
 */
export default function TourTooltip({
  step, index, size, isLastStep, backProps, closeProps, primaryProps, skipProps, tooltipProps,
}: TooltipRenderProps) {
  const reduced = useReducedMotion();
  const isFirstStep = index === 0;
  const meta = (step.data ?? {}) as Partial<TourStepMeta>;
  const pct = size > 0 ? Math.round(((index + 1) / size) * 100) : 0;

  return (
    <div {...tooltipProps} className="tourCard">
      <div className="tourCard__rail">
        <motion.div
          className="tourCard__railFill"
          initial={reduced ? false : { width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={reduced ? { duration: 0 } : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      <div className="tourCard__body">
        <div className="tourCard__head">
          <TourIcon name={meta.icon} />
          <div className="tourCard__headText">
            {step.title ? <b>{step.title}</b> : null}
            <span>{meta.page ? `${meta.page} · ` : ""}Step {index + 1} of {size}</span>
          </div>
          <button {...closeProps} className="tourCard__close" aria-label="Close this tour">
            <X aria-hidden="true" />
          </button>
        </div>

        {meta.showEstimate && meta.estimateMinutes && meta.totalStops ? (
          <p className="tourCard__estimate">
            <Clock3 aria-hidden="true" />~{meta.estimateMinutes} min · {meta.totalStops} stops
          </p>
        ) : null}

        {step.content ? <p className="tourCard__content">{step.content}</p> : null}

        {meta.interactHint ? (
          <div className="tourCard__interact">
            <span className="tourCard__interactDot">
              {!reduced && (
                <motion.span
                  aria-hidden="true"
                  className="tourCard__interactPulse"
                  animate={{ scale: [1, 1.7], opacity: [0.5, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                />
              )}
              <MousePointerClick aria-hidden="true" />
            </span>
            <p>{meta.interactHint}</p>
          </div>
        ) : null}

        {meta.encouragement ? <p className="tourCard__encouragement">{meta.encouragement}</p> : null}

        <div className="tourCard__foot">
          <div className="tourCard__btns">
            {!isFirstStep ? (
              <button {...backProps} className="ad__btn tourCard__btn">
                <ChevronLeft aria-hidden="true" /> Back
              </button>
            ) : null}
            {!isLastStep ? (
              <button {...skipProps} className="ad__btn tourCard__btn">
                <SkipForward aria-hidden="true" /> Skip tour
              </button>
            ) : null}
            <button {...primaryProps} className="ad__btn ad__btn--primary tourCard__btn">
              {isLastStep ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
