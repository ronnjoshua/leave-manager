import { LeaveState } from "./types";

const STORAGE_KEY = "leave-calculator-state";

export function loadState(): LeaveState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LeaveState;
  } catch {
    return null;
  }
}

export function saveState(state: LeaveState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
