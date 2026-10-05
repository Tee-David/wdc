"use client";
import { createContext, useContext, type ReactNode } from "react";
const ReadOnly = createContext(false);
export function SupportReadOnly({ children, active }: { children: ReactNode; active: boolean }) {
  return <ReadOnly.Provider value={active}>{children}</ReadOnly.Provider>;
}
export function useSupportReadOnly() { return useContext(ReadOnly); }
