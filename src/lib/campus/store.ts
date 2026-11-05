import { useSyncExternalStore } from "react";
import type { ActionResult, CampusState, Role } from "./types";
import { STATE_VERSION, createSeedState } from "./seed";

const STORAGE_KEY = "campusconnect:v1";

let state: CampusState | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  if (!state || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked — the demo keeps working in memory.
  }
}

/** Load saved demo data (or fresh sample data) in the browser. Call once after mount. */
export function hydrateCampus() {
  if (state) return;
  let loaded: CampusState | null = null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CampusState;
      if (parsed?.version === STATE_VERSION) loaded = parsed;
    }
  } catch {
    loaded = null;
  }
  state = loaded ?? createSeedState(new Date());
  persist();
  emit();
}

export function resetCampus() {
  state = createSeedState(new Date());
  persist();
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Null until the browser has loaded the demo data. */
export function useCampusMaybe(): CampusState | null {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => null,
  );
}

/** Use inside pages rendered by the app shell (which waits for data). */
export function useCampus(): CampusState {
  const s = useCampusMaybe();
  if (!s) throw new Error("Campus data not loaded yet");
  return s;
}

/** Run a pure action against current state; commits on success and returns the result. */
export function runAction<T>(fn: (s: CampusState, now: Date) => ActionResult<T>): ActionResult<T> {
  if (!state) return { ok: false, error: "Still loading — try again in a moment." };
  const result = fn(state, new Date());
  if (result.ok) {
    state = result.state;
    persist();
    emit();
  }
  return result;
}

export function updateState(fn: (s: CampusState) => CampusState) {
  if (!state) return;
  state = fn(state);
  persist();
  emit();
}

export function setRole(role: Role) {
  updateState((s) => ({ ...s, role }));
}

/** The identity the current view acts as. */
export function currentIdentity(s: CampusState) {
  return s.role === "student"
    ? { role: "student" as const, id: s.currentStudentId }
    : { role: "tutor" as const, id: s.currentTutorId };
}
