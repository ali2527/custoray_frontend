const PENDING_EMAIL_KEY = "custoray:pending-verify-email"

export function readPendingVerifyEmail() {
  if (typeof window === "undefined") return ""
  try {
    return sessionStorage.getItem(PENDING_EMAIL_KEY)?.trim() || ""
  } catch {
    return ""
  }
}

export function rememberPendingVerifyEmail(email: string) {
  const value = email.trim()
  if (!value || typeof window === "undefined") return
  try {
    sessionStorage.setItem(PENDING_EMAIL_KEY, value)
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearPendingVerifyEmail() {
  try {
    sessionStorage.removeItem(PENDING_EMAIL_KEY)
  } catch {
    /* ignore */
  }
}
