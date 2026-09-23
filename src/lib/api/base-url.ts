/**
 * Resolve the API base URL from the current app origin.
 *
 * app.custoray.com      → https://api.custoray.com/api/v1
 * dev-app.custoray.com  → https://dev-api.custoray.com/api/v1
 * localhost / 127.0.0.1 → http://localhost:3034/api/v1
 *
 * Optional override: NEXT_PUBLIC_API_URL (local tunnels / one-off testing only).
 */

const LOCAL_API = "http://localhost:3034/api/v1"

const HOST_API_MAP: Record<string, string> = {
  "app.custoray.com": "https://api.custoray.com/api/v1",
  "dev-app.custoray.com": "https://dev-api.custoray.com/api/v1",
  localhost: LOCAL_API,
  "127.0.0.1": LOCAL_API,
}

function normalizeBase(url: string) {
  return url.replace(/\/$/, "")
}

export function apiBaseForHost(hostname: string): string {
  const override = process.env.NEXT_PUBLIC_API_URL?.trim()
  if (override && (hostname === "localhost" || hostname === "127.0.0.1")) {
    return normalizeBase(override)
  }

  const mapped = HOST_API_MAP[hostname.toLowerCase()]
  if (mapped) return mapped

  if (override) return normalizeBase(override)

  return LOCAL_API
}

/** Runtime API base — call per request so static builds pick the right host. */
export function getApiBaseUrl(): string {
  if (typeof window !== "undefined" && window.location?.hostname) {
    return apiBaseForHost(window.location.hostname)
  }

  const override = process.env.NEXT_PUBLIC_API_URL?.trim()
  if (override) return normalizeBase(override)
  return LOCAL_API
}
