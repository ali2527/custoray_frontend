/**
 * Phase 2: the 2FA challenge secret is an HttpOnly cookie set by the API.
 * This module only tracks a non-secret UI flag for routing to /2fa.
 */

const PENDING_KEY = "custoray:2fa-pending"

export function markTwoFactorPending() {
  if (typeof window === "undefined") return
  sessionStorage.setItem(PENDING_KEY, "1")
}

export function isTwoFactorPending() {
  if (typeof window === "undefined") return false
  return sessionStorage.getItem(PENDING_KEY) === "1"
}

export function clearTwoFactorChallenge() {
  if (typeof window === "undefined") return
  sessionStorage.removeItem(PENDING_KEY)
}

export function formatTotpSecret(secret: string) {
  return secret.replace(/(.{4})/g, "$1 ").trim()
}
