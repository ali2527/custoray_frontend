import { resetSetupProgress } from "@/lib/setup-progress"

const WELCOME_STORAGE_KEY = "custoray-welcome-v14"
const WELCOME_STEP_KEY = "custoray-welcome-step-v16"
const WELCOME_USER_KEY = "custoray-welcome-user-v14"
export const WELCOME_OPEN_EVENT = "custoray-welcome-open"

export type WelcomeSetupStep = 0 | 1 | 2 | 3 | 4 | 5 | 6

export function markWelcomeFlow() {
  queueWelcomeFlow()
}

export function queueWelcomeFlow() {
  try {
    localStorage.setItem(WELCOME_STORAGE_KEY, "pending")
  } catch {
    /* ignore */
  }
}

/** A different account starts setup from the first screen, not the last one's progress. */
export function startWelcomeForUser(userId: string) {
  const id = userId.trim()
  if (!id) {
    queueWelcomeFlow()
    return
  }
  let previous = ""
  try {
    previous = localStorage.getItem(WELCOME_USER_KEY) || ""
  } catch {
    previous = ""
  }
  if (previous !== id) {
    resetWelcomeFlow()
    resetSetupProgress()
    try {
      localStorage.setItem(WELCOME_USER_KEY, id)
    } catch {
      /* ignore */
    }
  }
  queueWelcomeFlow()
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
    localStorage.removeItem(WELCOME_STEP_KEY)
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

/** Clear welcome state so the setup wizard can run again. */
export function resetWelcomeFlow() {
  try {
    localStorage.removeItem(WELCOME_STORAGE_KEY)
    localStorage.removeItem(WELCOME_STEP_KEY)
    localStorage.removeItem(WELCOME_USER_KEY)
  } catch {
    /* ignore */
  }
}

export function saveWelcomeSetupStep(step: WelcomeSetupStep) {
  try {
    localStorage.setItem(WELCOME_STEP_KEY, String(step))
  } catch {
    /* ignore */
  }
}

export function readWelcomeSetupStep(): WelcomeSetupStep {
  try {
    const raw = Number(localStorage.getItem(WELCOME_STEP_KEY) ?? "0")
    if (raw >= 0 && raw <= 6) return raw as WelcomeSetupStep
  } catch {
    /* ignore */
  }
  return 0
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
