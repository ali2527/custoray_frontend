const LOWER = "abcdefghijkmnopqrstuvwxyz"
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ"
const DIGITS = "23456789"
const SYMBOLS = "!@#$%^&*-_=+"
const ALL = LOWER + UPPER + DIGITS + SYMBOLS

export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128

export const PASSWORD_RULE_IDS = [
  "minLength",
  "lowercase",
  "uppercase",
  "digit",
  "special",
  "noEdgeSpaces",
  "maxLength",
] as const

export type PasswordRuleId = (typeof PASSWORD_RULE_IDS)[number]

export type PasswordRuleResult = {
  id: PasswordRuleId
  ok: boolean
}

function randomIndex(max: number): number {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const buf = new Uint32Array(1)
    crypto.getRandomValues(buf)
    return buf[0]! % max
  }
  return Math.floor(Math.random() * max)
}

function pick(alphabet: string): string {
  return alphabet[randomIndex(alphabet.length)]!
}

/** Cryptographically strong password that always includes mixed case, a digit, and a symbol. */
export function generateStrongPassword(length = 16): string {
  const size = Math.max(12, Math.min(64, Math.floor(length)))
  const chars = [
    pick(LOWER),
    pick(UPPER),
    pick(DIGITS),
    pick(SYMBOLS),
  ]
  while (chars.length < size) {
    chars.push(pick(ALL))
  }
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomIndex(i + 1)
    ;[chars[i], chars[j]] = [chars[j]!, chars[i]!]
  }
  return chars.join("")
}

export function getPasswordRuleResults(password: string): PasswordRuleResult[] {
  return [
    { id: "minLength", ok: password.length >= PASSWORD_MIN_LENGTH },
    { id: "lowercase", ok: /[a-z]/.test(password) },
    { id: "uppercase", ok: /[A-Z]/.test(password) },
    { id: "digit", ok: /\d/.test(password) },
    { id: "special", ok: /[^A-Za-z0-9]/.test(password) },
    { id: "noEdgeSpaces", ok: password.length === 0 || password === password.trim() },
    { id: "maxLength", ok: password.length <= PASSWORD_MAX_LENGTH },
  ]
}

export function isPasswordStrong(password: string): boolean {
  return getPasswordRuleResults(password).every((rule) => rule.ok)
}

/** First failing rule id, or null when valid. */
export function firstFailedPasswordRule(password: string): PasswordRuleId | null {
  return getPasswordRuleResults(password).find((rule) => !rule.ok)?.id ?? null
}
