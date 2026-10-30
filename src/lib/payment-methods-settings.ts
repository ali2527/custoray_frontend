import { z } from "zod"

export const PAYMENT_METHODS_STORAGE_KEY = "custoray-payment-methods-v1"
export const PAYMENT_METHODS_EVENT = "custoray-payment-methods"

/** Built-in defaults; tenants can add more in Settings → Documents. */
export const DEFAULT_PAYMENT_METHODS = [
  "Cash",
  "Bank transfer",
  "Card",
  "Credit",
] as const

export const paymentMethodsSettingsSchema = z.object({
  methods: z.array(z.string().trim().min(1).max(40)).min(1).max(40),
})

export type PaymentMethodsSettings = z.infer<typeof paymentMethodsSettingsSchema>

export const DEFAULT_PAYMENT_METHODS_SETTINGS: PaymentMethodsSettings = {
  methods: [...DEFAULT_PAYMENT_METHODS],
}

function normalizeMethod(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 40)
}

export function normalizePaymentMethodsList(methods: string[]): string[] {
  const seen = new Set<string>()
  const next: string[] = []
  for (const raw of methods) {
    const method = normalizeMethod(raw)
    if (!method) continue
    const key = method.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    next.push(method)
  }
  return next.length > 0 ? next : [...DEFAULT_PAYMENT_METHODS]
}

export function parsePaymentMethodsSettings(
  raw: string | null
): PaymentMethodsSettings | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed)) {
      return { methods: normalizePaymentMethodsList(parsed.map(String)) }
    }
    const result = paymentMethodsSettingsSchema.safeParse(parsed)
    if (!result.success) return null
    return { methods: normalizePaymentMethodsList(result.data.methods) }
  } catch {
    return null
  }
}

export function loadPaymentMethodsSettings(): PaymentMethodsSettings {
  if (typeof window === "undefined") {
    return { methods: [...DEFAULT_PAYMENT_METHODS] }
  }
  return (
    parsePaymentMethodsSettings(
      window.localStorage.getItem(PAYMENT_METHODS_STORAGE_KEY)
    ) ?? { methods: [...DEFAULT_PAYMENT_METHODS] }
  )
}

export function savePaymentMethodsSettings(settings: PaymentMethodsSettings) {
  if (typeof window === "undefined") return
  const next: PaymentMethodsSettings = {
    methods: normalizePaymentMethodsList(settings.methods),
  }
  window.localStorage.setItem(PAYMENT_METHODS_STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event(PAYMENT_METHODS_EVENT))
}

export function addPaymentMethod(name: string): PaymentMethodsSettings {
  const current = loadPaymentMethodsSettings()
  const next = {
    methods: normalizePaymentMethodsList([...current.methods, name]),
  }
  savePaymentMethodsSettings(next)
  return next
}

export function removePaymentMethod(name: string): PaymentMethodsSettings {
  const current = loadPaymentMethodsSettings()
  const filtered = current.methods.filter(
    (method) => method.toLowerCase() !== name.trim().toLowerCase()
  )
  const next = {
    methods: normalizePaymentMethodsList(
      filtered.length > 0 ? filtered : [...DEFAULT_PAYMENT_METHODS]
    ),
  }
  savePaymentMethodsSettings(next)
  return next
}
