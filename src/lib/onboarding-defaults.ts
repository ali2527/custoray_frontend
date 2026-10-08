/** Smart defaults for regional onboarding from signup country / browser. */

export type DateFormatOption = "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD"

export type RegionalDefaults = {
  currency: string
  timezone: string
  dateFormat: DateFormatOption
  language: "en" | "ar" | "ur"
}

const COUNTRY_DEFAULTS: Record<string, RegionalDefaults> = {
  Pakistan: {
    currency: "PKR",
    timezone: "Asia/Karachi",
    dateFormat: "DD/MM/YYYY",
    language: "en",
  },
  India: {
    currency: "INR",
    timezone: "Asia/Kolkata",
    dateFormat: "DD/MM/YYYY",
    language: "en",
  },
  "United Arab Emirates": {
    currency: "AED",
    timezone: "Asia/Dubai",
    dateFormat: "DD/MM/YYYY",
    language: "en",
  },
  "Saudi Arabia": {
    currency: "SAR",
    timezone: "Asia/Riyadh",
    dateFormat: "DD/MM/YYYY",
    language: "ar",
  },
  "United Kingdom": {
    currency: "GBP",
    timezone: "Europe/London",
    dateFormat: "DD/MM/YYYY",
    language: "en",
  },
  "United States": {
    currency: "USD",
    timezone: "America/New_York",
    dateFormat: "MM/DD/YYYY",
    language: "en",
  },
  Canada: {
    currency: "CAD",
    timezone: "America/Toronto",
    dateFormat: "YYYY-MM-DD",
    language: "en",
  },
  Australia: {
    currency: "AUD",
    timezone: "Australia/Sydney",
    dateFormat: "DD/MM/YYYY",
    language: "en",
  },
}

export const CURRENCY_OPTIONS = [
  { code: "PKR", label: "PKR — Pakistani Rupee" },
  { code: "USD", label: "USD — US Dollar" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "GBP", label: "GBP — British Pound" },
  { code: "INR", label: "INR — Indian Rupee" },
  { code: "AED", label: "AED — UAE Dirham" },
  { code: "SAR", label: "SAR — Saudi Riyal" },
  { code: "CAD", label: "CAD — Canadian Dollar" },
  { code: "AUD", label: "AUD — Australian Dollar" },
] as const

export const TIMEZONE_OPTIONS = [
  { value: "Asia/Karachi", label: "Asia/Karachi — GMT+05:00" },
  { value: "Asia/Dubai", label: "Asia/Dubai — GMT+04:00" },
  { value: "Asia/Riyadh", label: "Asia/Riyadh — GMT+03:00" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata — GMT+05:30" },
  { value: "Europe/London", label: "Europe/London — GMT+00:00" },
  { value: "America/New_York", label: "America/New_York — GMT−05:00" },
  { value: "America/Toronto", label: "America/Toronto — GMT−05:00" },
  { value: "Australia/Sydney", label: "Australia/Sydney — GMT+10:00" },
] as const

export const DATE_FORMAT_OPTIONS: {
  value: DateFormatOption
  label: string
  example: string
}[] = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY", example: "09/10/2026" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY", example: "10/09/2026" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD", example: "2026-10-09" },
]

export const PAYMENT_TERM_PRESETS = [
  { days: 0, labelKey: "dueOnReceipt" as const },
  { days: 7, labelKey: "net7" as const },
  { days: 15, labelKey: "net15" as const },
  { days: 30, labelKey: "net30" as const, recommended: true },
  { days: 60, labelKey: "net60" as const },
] as const

const FALLBACK: RegionalDefaults = {
  currency: "PKR",
  timezone: "Asia/Karachi",
  dateFormat: "DD/MM/YYYY",
  language: "en",
}

export function regionalDefaultsForCountry(country?: string | null): RegionalDefaults {
  if (!country) return { ...FALLBACK }
  return { ...(COUNTRY_DEFAULTS[country] ?? FALLBACK) }
}

export function detectBrowserTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null
  } catch {
    return null
  }
}

export function formatInvoicePreview(prefix: string, next: number) {
  const clean = prefix.replace(/[^a-zA-Z0-9_-]/g, "").replace(/[-_]+$/g, "") || "INV"
  return `${clean}-${String(Math.max(1, next)).padStart(4, "0")}`
}

export function composeAddress(parts: {
  street?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
}) {
  return [parts.street, parts.city, parts.state, parts.postalCode, parts.country]
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join(", ")
}
