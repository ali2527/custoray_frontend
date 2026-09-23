/**
 * Resolve Google OAuth web client ID from the current app origin.
 *
 * app.custoray.com           → NEXT_PUBLIC_GOOGLE_CLIENT_ID_PROD
 * dev-app.custoray.com / local → NEXT_PUBLIC_GOOGLE_CLIENT_ID_DEV
 *
 * Values are baked at build time from GitHub Environment variables.
 * Optional legacy fallback: NEXT_PUBLIC_GOOGLE_CLIENT_ID
 */

function trimEnv(value: string | undefined) {
  return value?.trim() || ""
}

export function googleClientIdForHost(hostname: string): string {
  const prod = trimEnv(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID_PROD)
  const dev = trimEnv(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID_DEV)
  const legacy = trimEnv(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID)

  const host = hostname.toLowerCase()
  if (host === "app.custoray.com") return prod || legacy
  if (
    host === "dev-app.custoray.com" ||
    host === "localhost" ||
    host === "127.0.0.1"
  ) {
    return dev || legacy
  }

  return legacy || prod || dev
}

export function getGoogleClientId(): string {
  if (typeof window !== "undefined" && window.location?.hostname) {
    return googleClientIdForHost(window.location.hostname)
  }
  return (
    trimEnv(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) ||
    trimEnv(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID_DEV) ||
    trimEnv(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID_PROD)
  )
}
