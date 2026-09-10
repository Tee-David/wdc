"use client";

import type { ReactNode } from "react";
import "./device-frame.css";

/**
 * A real device frame with content behind its screen cutout.
 *
 * The frames are the MIT-licensed renders from the `launch` project (an iPhone
 * 17 Pro, a Galaxy S21 Ultra and a MacBook Air 13), which is what was asked
 * for. The screen rectangles below are not eyeballed: each frame ships with an
 * alpha mask marking its screen, and these percentages were measured off those
 * masks by thresholding the alpha and taking its bounding box. The aspect
 * ratios that fell out — 0.485, 0.449 and 1.540 — match the real hardware,
 * which is the check that the numbers are right.
 *
 * The frame sits ABOVE the content rather than the content being clipped into a
 * hole: a PNG over the top keeps the bezel highlights, the camera and the
 * rounded corners the render already draws, where a CSS clip-path would flatten
 * all of it and put us back to drawing a rounded rectangle by hand.
 */

/* Measured from each frame's own alpha mask. Percentages of the frame image, so
   they hold at any rendered size. */
const SCREENS = {
  iphone:  { left: 3.129,  top: 1.878,  right: 96.871, bottom: 98.122, radius: "13%/6.4%", ratio: 560 / 1124 },
  android: { left: 11.033, top: 5.639,  right: 88.967, bottom: 94.361, radius: "9%/4.6%",  ratio: 560 / 1096 },
  macbook: { left: 10.342, top: 10.524, right: 89.658, bottom: 89.476, radius: "1%/1.6%",  ratio: 1280 / 835 },
} as const;

export type DeviceId = keyof typeof SCREENS;

const LABEL: Record<DeviceId, string> = {
  iphone: "iPhone",
  android: "Android phone",
  macbook: "laptop",
};

export default function DeviceFrame({
  device,
  children,
  className = "",
  alt,
}: {
  device: DeviceId;
  children: ReactNode;
  className?: string;
  /** What is ON the screen, for anyone who cannot see it. */
  alt?: string;
}) {
  const s = SCREENS[device];
  return (
    <div
      className={`dfr dfr--${device} ${className}`.trim()}
      style={{ aspectRatio: String(s.ratio) }}
    >
      <div
        className="dfr__screen"
        style={{
          left: `${s.left}%`,
          top: `${s.top}%`,
          width: `${s.right - s.left}%`,
          height: `${s.bottom - s.top}%`,
          borderRadius: s.radius,
        }}
      >
        {children}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="dfr__shell"
        src={`/frames/${device}.png`}
        alt={alt ? `${alt}, shown on an ${LABEL[device]}` : ""}
        aria-hidden={alt ? undefined : true}
        loading="lazy"
        draggable={false}
      />
    </div>
  );
}
