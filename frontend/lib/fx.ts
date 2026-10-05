/**
 * The one naira-to-dollar rate on the site, set by hand.
 *
 * Nothing here calls an FX API: a rate that moves under a visitor mid-session
 * makes a calculator look broken. `reviewed` is the month somebody last checked it.
 */
export const FX = {
  nairaPerUsd: 1_550,
  reviewed: "2026-09",
} as const;
