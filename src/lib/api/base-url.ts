/**
 * Resolve the API base URL from the current app origin.
 *
 * app.custoray.com      → https://api.custoray.com/api/v1
 * dev-app.custoray.com  → https://dev-api.custoray.com/api/v1
 * localhost / 127.0.0.1 → http://localhost:3034/api/v1
 * LAN IP (192.168.x.x)  → http://<same-ip>:3034/api/v1  (keeps cookies same-site)
 *
 * Optional override: NEXT_PUBLIC_API_URL (local tunnels / one-off testing only).
 */

const LOCAL_API_PORT = 3034

const HOST_API_MAP: Record<string, string> = {
  "app.custoray.com": "https://api.custoray.com/api/v1",
  "dev-app.custoray.com": "https://dev-api.custoray.com/api/v1",
}

function normalizeBase(url: string) {
  return url.replace(/\/$/, "")
}

/** Private / loopback hosts used for local and LAN development. */
export function isLocalDevHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  if (host === "localhost" || host === "127.0.0.1") return true
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)) return true
  return false
}

export function apiBaseForHost(hostname: string): string {
  const host = hostname.toLowerCase()
  const override = process.env.NEXT_PUBLIC_API_URL?.trim()

  // Localhost may use an explicit tunnel/API override.
  if ((host === "localhost" || host === "127.0.0.1") && override) {
    return normalizeBase(override)
  }

  const mapped = HOST_API_MAP[host]
  if (mapped) return mapped

  // LAN: call the API on the same host so auth cookies stay same-site.
  // Using localhost from a 192.168.* page is cross-site and drops cookies on PATCH.
  if (isLocalDevHost(host)) {
    const apiHost = host === "localhost" || host === "127.0.0.1" ? "localhost" : host
    return `http://${apiHost}:${LOCAL_API_PORT}/api/v1`
  }

  if (override) return normalizeBase(override)

  return `http://localhost:${LOCAL_API_PORT}/api/v1`
}

/** Runtime API base — call per request so static builds pick the right host. */
export function getApiBaseUrl(): string {
  if (typeof window !== "undefined" && window.location?.hostname) {
    return apiBaseForHost(window.location.hostname)
  }

  const override = process.env.NEXT_PUBLIC_API_URL?.trim()
  if (override) return normalizeBase(override)
  return `http://localhost:${LOCAL_API_PORT}/api/v1`
}
