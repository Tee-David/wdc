"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";

const SmoothCursor = dynamic(
  () => import("./smooth-cursor").then((module) => module.SmoothCursorMount),
  { ssr: false },
);

const query = "(any-hover: hover) and (any-pointer: fine) and (prefers-reduced-motion: no-preference)";

function subscribe(notify: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
}

const getSnapshot = () => window.matchMedia(query).matches;
const getServerSnapshot = () => false;

/** Avoid downloading the motion-powered custom cursor on touch devices. */
export default function SmoothCursorLoader() {
  const enabled = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return enabled ? <SmoothCursor /> : null;
}
