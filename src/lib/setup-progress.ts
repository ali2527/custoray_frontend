const SETUP_STORAGE_KEY = "custoray-setup-progress-v2"

export type SetupMilestoneId = "settings" | "product" | "customer" | "invoice"

export type SetupProgress = Record<SetupMilestoneId, boolean>

const EMPTY_PROGRESS: SetupProgress = {
  settings: false,
  product: false,
  customer: false,
  invoice: false,
}

export const SETUP_PROGRESS_EVENT = "custoray-setup-progress"

export type SetupProgressEventDetail = {
  id?: SetupMilestoneId
  newlyCompleted?: boolean
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

export function resetSetupProgress() {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(SETUP_STORAGE_KEY)
  } catch {
    /* ignore */
  }
  window.dispatchEvent(
    new CustomEvent<SetupProgressEventDetail>(SETUP_PROGRESS_EVENT, {
      detail: {},
    })
  )
}

export function markSetupMilestone(id: SetupMilestoneId) {
  const previous = loadSetupProgress()
  if (previous[id]) return previous
  const next = { ...previous, [id]: true }
  saveSetupProgress(next)
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<SetupProgressEventDetail>(SETUP_PROGRESS_EVENT, {
        detail: { id, newlyCompleted: true },
      })
    )
  }
  return next
}

export function setupCompletedCount(progress: SetupProgress) {
  return (["settings", "product", "customer", "invoice"] as const).filter(
    (key) => progress[key]
  ).length
}
