import { ChevronLeft, SkipForward, X } from "lucide-react";
import type { TooltipRenderProps } from "react-joyride";

/**
 * The tour's own tooltip card, built from `.ad__` primitives rather than
 * Joyride's built-in styling API.
 *
 * WHY A CUSTOM COMPONENT AND NOT `styles`. Joyride's `styles` prop recolours
 * its own markup; it cannot give the Back/Next/Skip buttons the admin's own
 * `.ad__btn` treatment, its 44px touch target, or its focus ring, which is
 * what section 5.3 actually asks for ("match the WDC/Litch-parity dashboard
 * in both themes"). `tooltipComponent` replaces the markup entirely, so this
 * card is plain admin chrome that happens to be positioned by Joyride's own
 * floating-ui logic -- every colour is one of the `--ad-*` tokens, which is
 * what makes it correct in dark mode with no second branch here.
 */
export default function TourTooltip({
  step, index, size, isLastStep, backProps, closeProps, primaryProps, skipProps, tooltipProps,
}: TooltipRenderProps) {
  const isFirstStep = index === 0;
  return (
    <div {...tooltipProps} className="tourCard">
      <div className="tourCard__head">
        {step.title ? <b>{step.title}</b> : <span />}
        <button {...closeProps} className="tourCard__close" aria-label="Close this tour">
          <X aria-hidden="true" />
        </button>
      </div>
      {step.content ? <p className="tourCard__body">{step.content}</p> : null}
      <div className="tourCard__foot">
        <span className="tourCard__progress">{index + 1} of {size}</span>
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
  );
}
