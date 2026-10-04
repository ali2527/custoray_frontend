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

export function isNotFoundError(error: unknown) {
  return (
    error instanceof ApiClientError &&
    (error.status === 404 || error.code === "NOT_FOUND")
  )
}

export function settledErrorMessage(
  results: PromiseSettledResult<unknown>[]
): string | undefined {
  for (const result of results) {
    if (result.status !== "rejected") continue
    const reason = result.reason
    if (reason instanceof ApiClientError && reason.message.trim()) return reason.message
    if (reason instanceof Error && reason.message.trim()) return reason.message
  }
  return undefined
}

export function uniqueErrorMessages(
  errors: { message?: string }[] | undefined,
  limit = 3
): string | undefined {
  if (!errors?.length) return undefined
  const unique = [
    ...new Set(errors.map((error) => error.message?.trim()).filter(Boolean)),
  ] as string[]
  if (unique.length === 0) return undefined
  return unique.slice(0, limit).join(" ")
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
  if (code === "ACCOUNT_BLOCKED") return false
  // UNAUTHORIZED / TOKEN_EXPIRED / SESSION_ENDED: try cookie refresh once.
  return !SKIP_REFRESH_PATHS.some((p) => path === p || path.startsWith(`${p}/`))
}

async function refreshAccessCookie() {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
          method: "POST",
          credentials: "include",
          cache: "no-store",
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
    cache: options.cache ?? "no-store",
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

    if (code === "ACCOUNT_BLOCKED") {
      emitSessionExpired()
    } else if (!isRetry && shouldRefresh(path, res.status, code)) {
      // Missing/expired access cookie is common after 15m idle or token rotation.
      // Always try one refresh before forcing logout (covers product PATCH saves).
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
