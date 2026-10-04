import { z } from "zod"

export const MONEY_FORMAT_STORAGE_KEY = "custoray-money-format-v1"
export const MONEY_FORMAT_EVENT = "custoray-money-format"

export const MONEY_FORMAT_VARIANTS = [
  "us",
  "pakistani",
  "indian",
  "uk",
] as const

export const moneyFormatVariantSchema = z.enum(MONEY_FORMAT_VARIANTS)
export type MoneyFormatVariant = z.infer<typeof moneyFormatVariantSchema>

export const moneyFormatSettingsSchema = z.object({
  variant: moneyFormatVariantSchema,
})

export type MoneyFormatSettings = z.infer<typeof moneyFormatSettingsSchema>

export type MoneyFormatPreset = {
  variant: MoneyFormatVariant
  locale: string
  currency: string
  /** Example amount used in settings previews. */
  sample: number
}

export const MONEY_FORMAT_PRESETS: Record<MoneyFormatVariant, MoneyFormatPreset> =
  {
    us: {
      variant: "us",
      locale: "en-US",
      currency: "USD",
      sample: 1234567.89,
    },
    pakistani: {
      // en-PK uses western grouping; en-IN gives lakh/crore commas with PKR.
      variant: "pakistani",
      locale: "en-IN",
      currency: "PKR",
      sample: 1234567.89,
    },
    indian: {
      variant: "indian",
      locale: "en-IN",
      currency: "INR",
      sample: 1234567.89,
    },
    uk: {
      variant: "uk",
      locale: "en-GB",
      currency: "GBP",
      sample: 1234567.89,
    },
  }

export const DEFAULT_MONEY_FORMAT_SETTINGS: MoneyFormatSettings = {
  variant: "us",
}

export function parseMoneyFormatSettings(
  raw: string | null
): MoneyFormatSettings | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    const result = moneyFormatSettingsSchema.safeParse(parsed)
    return result.success ? result.data : null
  } catch {
    return null
  }
}

export function loadMoneyFormatSettings(): MoneyFormatSettings {
  if (typeof window === "undefined") return { ...DEFAULT_MONEY_FORMAT_SETTINGS }
  return (
    parseMoneyFormatSettings(
      window.localStorage.getItem(MONEY_FORMAT_STORAGE_KEY)
    ) ?? { ...DEFAULT_MONEY_FORMAT_SETTINGS }
  )
}

export function saveMoneyFormatSettings(settings: MoneyFormatSettings) {
  if (typeof window === "undefined") return
  const next: MoneyFormatSettings = {
    variant: MONEY_FORMAT_PRESETS[settings.variant]
      ? settings.variant
      : DEFAULT_MONEY_FORMAT_SETTINGS.variant,
  }
  window.localStorage.setItem(MONEY_FORMAT_STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event(MONEY_FORMAT_EVENT))
}

export function getMoneyFormatPreset(
  variant: MoneyFormatVariant = loadMoneyFormatSettings().variant
): MoneyFormatPreset {
  return MONEY_FORMAT_PRESETS[variant] ?? MONEY_FORMAT_PRESETS.us
}

export function formatMoneyWithSettings(
  value: string | number,
  settings: MoneyFormatSettings = loadMoneyFormatSettings()
): string {
  const n = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(n)) return String(value)
  const preset = getMoneyFormatPreset(settings.variant)
  // Prefer a familiar "Rs " prefix for Pakistan (Intl may emit "PKR").
  if (preset.variant === "pakistani") {
    const grouped = new Intl.NumberFormat(preset.locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n)
    return `Rs ${grouped}`
  }
  return new Intl.NumberFormat(preset.locale, {
    style: "currency",
    currency: preset.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

export function moneyFormatSample(
  variant: MoneyFormatVariant,
  amount: number = MONEY_FORMAT_PRESETS[variant].sample
): string {
  return formatMoneyWithSettings(amount, { variant })
}
