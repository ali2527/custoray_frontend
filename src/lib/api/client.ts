import { getApiBaseUrl } from "@/lib/api/base-url"

export class ApiClientError extends Error {
  code: string
  status: number
  errors: unknown

  constructor(status: number, code: string, message: string, errors?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.errors = errors
  }
}

type ApiEnvelope<T> = {
  success: boolean
  code?: string
  message?: string
  data: T
  errors?: unknown
}

const SKIP_REFRESH_PATHS = [
  "/auth/tenant/login",
  "/auth/tenant/signup",
  "/auth/google",
  "/auth/2fa/verify",
  "/auth/refresh",
  "/auth/logout",
  "/auth/forgot-password",
  "/auth/reset-password",
]

let refreshInFlight: Promise<boolean> | null = null

function shouldRefresh(path: string, status: number, code: string) {
  if (status !== 401) return false
  if (code === "TRIAL_EXPIRED" || code === "PLAN_EXPIRED") return false
  return !SKIP_REFRESH_PATHS.some((p) => path === p || path.startsWith(`${p}/`))
}

async function refreshAccessCookie() {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        })
        const json = (await res.json().catch(() => ({}))) as { success?: boolean }
        return res.ok && json.success !== false
      } catch {
        return false
      } finally {
        refreshInFlight = null
      }
    })()
  }
  return refreshInFlight
}

function emitSessionExpired() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event("custoray:session-expired"))
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  isRetry = false
): Promise<T> {
  const headers = new Headers(options.headers)
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json")
  }

  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers,
    credentials: "include",
  })

  const json = (await res.json().catch(() => ({}))) as ApiEnvelope<T> & {
    message?: string
    code?: string
    errors?: unknown
  }

  const code = json.code ?? "API_ERROR"

  if (!res.ok || json.success === false) {
    if (
      typeof window !== "undefined" &&
      (code === "TRIAL_EXPIRED" || code === "PLAN_EXPIRED")
    ) {
      window.dispatchEvent(new CustomEvent("custoray:access-blocked", { detail: code }))
    }

    if (!isRetry && shouldRefresh(path, res.status, code)) {
      const refreshed = await refreshAccessCookie()
      if (refreshed) {
        return apiFetch<T>(path, options, true)
      }
      emitSessionExpired()
    }

    throw new ApiClientError(
      res.status,
      code,
      json.message ?? "Request failed",
      json.errors
    )
  }

  return json.data
}

/** Always uses the backend resolved from the current origin. */
export function isApiEnabled() {
  return true
}

export { getApiBaseUrl }
