const KEY = "custoray.googleSignup"

export type PendingGoogleSignup = {
  signupToken: string
  email: string
  name: string
}

export function savePendingGoogleSignup(pending: PendingGoogleSignup) {
  sessionStorage.setItem(KEY, JSON.stringify(pending))
}

export function loadPendingGoogleSignup(): PendingGoogleSignup | null {
  if (typeof window === "undefined") return null
  const raw = sessionStorage.getItem(KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as PendingGoogleSignup
    if (!parsed.signupToken || !parsed.email || !parsed.name) return null
    return parsed
  } catch {
    return null
  }
}

export function clearPendingGoogleSignup() {
  sessionStorage.removeItem(KEY)
}
