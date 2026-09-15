const WELCOME_STORAGE_KEY = "custoray-welcome-v12"
export const WELCOME_OPEN_EVENT = "custoray-welcome-open"

export function queueWelcomeFlow() {
  try {
    localStorage.setItem(WELCOME_STORAGE_KEY, "pending")
  } catch {
    /* ignore */
  }
}

export function isWelcomeFlowPending() {
  try {
    return localStorage.getItem(WELCOME_STORAGE_KEY) === "pending"
  } catch {
    return false
  }
}

export function isWelcomeFlowCompleted() {
  try {
    return localStorage.getItem(WELCOME_STORAGE_KEY) === "done"
  } catch {
    return false
  }
}

export function isWelcomeFlowDismissed() {
  try {
    return localStorage.getItem(WELCOME_STORAGE_KEY) === "dismissed"
  } catch {
    return false
  }
}

export function completeWelcomeFlow() {
  try {
    localStorage.setItem(WELCOME_STORAGE_KEY, "done")
  } catch {
    /* ignore */
  }
}

export function dismissWelcomeFlow() {
  try {
    localStorage.setItem(WELCOME_STORAGE_KEY, "dismissed")
  } catch {
    /* ignore */
  }
}

export function requestWelcomeFlow() {
  queueWelcomeFlow()
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(WELCOME_OPEN_EVENT))
  }
}

export function pathMatches(pathname: string | null, target: string) {
  const a = (pathname ?? "").replace(/\/+$/, "") || "/"
  const b = target.replace(/\/+$/, "") || "/"
  return a === b
}

export function toAppPath(path: string) {
  return path.endsWith("/") ? path : `${path}/`
}
