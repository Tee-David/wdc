"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { Stage } from "./stage-store";

const StageContext = createContext<Stage | null>(null);

/**
 * One stage per page, shared by the brand panel (which draws it) and the form
 * (which directs it). The panel and the form are siblings in the layout, so
 * this sits above both.
 */
export function StageProvider({ children }: { children: React.ReactNode }) {
  const [stage] = useState(() => new Stage());
  useEffect(() => () => stage.destroy(), [stage]);
  return <StageContext.Provider value={stage}>{children}</StageContext.Provider>;
}

export function useStage() {
  const stage = useContext(StageContext);
  if (!stage) throw new Error("useStage() outside <StageProvider>");
  return stage;
}

const serverGreeting = { name: null, lang: null, line: "Hello" };

/** The name the greeting is addressed to, and in which language. */
export function useGreetingState() {
  const stage = useStage();
  return useSyncExternalStore(stage.subscribe, stage.greetingSnapshot, () => serverGreeting);
}
