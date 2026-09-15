const SETUP_STORAGE_KEY = "custoray-setup-progress-v1"

export type SetupMilestoneId = "settings" | "product" | "customer" | "invoice"

export type SetupProgress = Record<SetupMilestoneId, boolean>

const EMPTY_PROGRESS: SetupProgress = {
  settings: false,
  product: false,
  customer: false,
  invoice: false,
}

export function loadSetupProgress(): SetupProgress {
  if (typeof window === "undefined") return { ...EMPTY_PROGRESS }
  try {
    const raw = window.localStorage.getItem(SETUP_STORAGE_KEY)
    if (!raw) return { ...EMPTY_PROGRESS }
    const parsed = JSON.parse(raw) as Partial<SetupProgress>
    return {
      settings: Boolean(parsed.settings),
      product: Boolean(parsed.product),
      customer: Boolean(parsed.customer),
      invoice: Boolean(parsed.invoice),
    }
  } catch {
    return { ...EMPTY_PROGRESS }
  }
}

export function saveSetupProgress(progress: SetupProgress) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(SETUP_STORAGE_KEY, JSON.stringify(progress))
  } catch {
    /* ignore */
  }
}

export function markSetupMilestone(id: SetupMilestoneId) {
  const next = { ...loadSetupProgress(), [id]: true }
  saveSetupProgress(next)
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("custoray-setup-progress"))
  }
  return next
}

export function setupCompletedCount(progress: SetupProgress) {
  return (["settings", "product", "customer", "invoice"] as const).filter(
    (key) => progress[key]
  ).length
}
