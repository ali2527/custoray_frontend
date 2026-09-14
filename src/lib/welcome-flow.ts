const WELCOME_STORAGE_KEY = "custoray-welcome-v9"

export type OnboardingTourStep = {
  key: string
  path: string
  target: string
  placement: "top" | "bottom" | "left" | "right"
}

export const ONBOARDING_TOUR_STEPS: OnboardingTourStep[] = [
  { key: "dashboard.nav", path: "/home", target: "welcome-nav-dashboard", placement: "right" },
  { key: "dashboard.table", path: "/home", target: "welcome-dashboard-table", placement: "top" },
  { key: "dashboard.btn", path: "/home", target: "welcome-dashboard-btn", placement: "bottom" },
  { key: "dashboard.filter", path: "/home", target: "welcome-dashboard-chart", placement: "top" },
  { key: "products.nav", path: "/inventory/products", target: "welcome-nav-products", placement: "right" },
  { key: "products.table", path: "/inventory/products", target: "welcome-products-table", placement: "top" },
  { key: "products.btn", path: "/inventory/products", target: "welcome-products-btn", placement: "bottom" },
  { key: "products.filter", path: "/inventory/products", target: "welcome-products-filter", placement: "bottom" },
  { key: "customers.nav", path: "/customers", target: "welcome-nav-customers", placement: "right" },
  { key: "customers.table", path: "/customers", target: "welcome-customers-table", placement: "top" },
  { key: "customers.btn", path: "/customers", target: "welcome-customers-btn", placement: "bottom" },
  { key: "customers.filter", path: "/customers", target: "welcome-customers-filter", placement: "bottom" },
  { key: "sales.nav", path: "/sales", target: "welcome-nav-sales", placement: "right" },
  { key: "sales.table", path: "/sales", target: "welcome-sales-table", placement: "top" },
  { key: "sales.btn", path: "/sales", target: "welcome-sales-btn", placement: "bottom" },
  { key: "sales.filter", path: "/sales", target: "welcome-sales-filter", placement: "bottom" },
  { key: "pos.nav", path: "/pos", target: "welcome-nav-pos", placement: "right" },
  { key: "pos.table", path: "/pos", target: "welcome-pos-catalog", placement: "right" },
  { key: "pos.btn", path: "/pos", target: "welcome-pos-btn", placement: "left" },
  { key: "pos.filter", path: "/pos", target: "welcome-pos-filter", placement: "bottom" },
]

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

export function completeWelcomeFlow() {
  try {
    localStorage.setItem(WELCOME_STORAGE_KEY, "done")
  } catch {
    /* ignore */
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

export function tourTarget(id: string) {
  return () => {
    const el = document.querySelector(`[data-tour='${id}']`)
    return el instanceof HTMLElement && el.isConnected && el.getClientRects().length > 0
      ? el
      : null
  }
}

export function waitForTourTarget(
  id: string,
  timeoutMs = 8000,
  signal?: AbortSignal
) {
  return new Promise<HTMLElement | null>((resolve) => {
    if (signal?.aborted) {
      resolve(null)
      return
    }

    const existing = document.querySelector(`[data-tour='${id}']`)
    if (existing instanceof HTMLElement && existing.isConnected && existing.getClientRects().length > 0) {
      resolve(existing)
      return
    }

    const started = Date.now()
    let timer = 0
    let settled = false

    const finish = (el: HTMLElement | null) => {
      if (settled) return
      settled = true
      observer.disconnect()
      window.clearInterval(timer)
      signal?.removeEventListener("abort", onAbort)
      resolve(el)
    }

    const look = () => {
      const el = document.querySelector(`[data-tour='${id}']`)
      if (el instanceof HTMLElement && el.isConnected && el.getClientRects().length > 0) {
        finish(el)
        return
      }
      if (Date.now() - started > timeoutMs) finish(null)
    }

    const onAbort = () => finish(null)
    const observer = new MutationObserver(look)
    observer.observe(document.body, { childList: true, subtree: true })
    timer = window.setInterval(look, 80)
    signal?.addEventListener("abort", onAbort)
  })
}
