const PENDING_EMAIL_KEY = "custoray:pending-verify-email"
const VERIFIED_FLAG_KEY = "custoray:email-verified"

export function markEmailVerified() {
  try {
    localStorage.setItem(VERIFIED_FLAG_KEY, "1")
  } catch {
    /* ignore quota / private mode */
  }
  clearPendingVerifyEmail()
}

export function hasEmailVerifiedFlag() {
  try {
    return localStorage.getItem(VERIFIED_FLAG_KEY) === "1"
  } catch {
    return false
  }
}

export function clearEmailVerifiedFlag() {
  try {
    localStorage.removeItem(VERIFIED_FLAG_KEY)
  } catch {
    /* ignore */
  }
}

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
