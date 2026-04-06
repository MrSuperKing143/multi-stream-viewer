import type { ViewerPersistedState } from "@/types/viewer";
import { sanitizeViewerState } from "@/lib/viewer-state";

const STORAGE_KEY = "multi-stream-viewer:v1";

export function loadViewerState() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as
      | { version?: number; state?: unknown }
      | ViewerPersistedState;

    const candidate =
      typeof parsed === "object" && parsed && "state" in parsed
        ? parsed.state
        : parsed;

    return sanitizeViewerState(candidate);
  } catch {
    return null;
  }
}

export function saveViewerState(state: ViewerPersistedState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      version: 1,
      state,
    }),
  );
}
