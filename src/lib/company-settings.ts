import { z } from "zod"

export const companySettingsSchema = z.object({
  name: z.string(),
  industry: z.string(),
  country: z.string(),
  addressLine1: z.string(),
  addressLine2: z.string(),
  city: z.string(),
  state: z.string(),
  postalCode: z.string(),
  phone: z.string(),
  email: z.string(),
  logoUrl: z.string(),
  currency: z.string(),
  timezone: z.string(),
  dateFormat: z.enum(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]),
  invoicePrefix: z.string(),
  nextInvoiceNumber: z.number().int().min(1),
  paymentTermsDays: z.number().int().min(0),
  invoiceNote: z.string(),
  paymentInstructions: z.string(),
})

export type CompanySettings = z.infer<typeof companySettingsSchema>

export const COMPANY_SETTINGS_STORAGE_KEY = "custoray-company-settings-v1"
export const COMPANY_SETTINGS_EVENT = "custoray-company-settings"

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  name: "",
  industry: "",
  country: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  phone: "",
  email: "",
  logoUrl: "",
  currency: "PKR",
  timezone: "Asia/Karachi",
  dateFormat: "DD/MM/YYYY",
  invoicePrefix: "INV",
  nextInvoiceNumber: 1,
  paymentTermsDays: 30,
  invoiceNote: "",
  paymentInstructions: "",
}

export function parseCompanySettings(raw: string | null): CompanySettings | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    const result = companySettingsSchema.safeParse(parsed)
    return result.success ? result.data : null
  } catch {
    return null
  }
}

export function loadCompanySettings(): CompanySettings {
  if (typeof window === "undefined") return { ...DEFAULT_COMPANY_SETTINGS }
  return (
    parseCompanySettings(window.localStorage.getItem(COMPANY_SETTINGS_STORAGE_KEY)) ?? {
      ...DEFAULT_COMPANY_SETTINGS,
    }
  )
}

export function saveCompanySettings(settings: CompanySettings) {
  if (typeof window === "undefined") return
  const next = companySettingsSchema.parse({
    ...DEFAULT_COMPANY_SETTINGS,
    ...settings,
  })
  window.localStorage.setItem(COMPANY_SETTINGS_STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event(COMPANY_SETTINGS_EVENT))
}

export function companySettingsFromRemote(remote: {
  name?: string | null
  industry?: string | null
  country?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
  phone?: string | null
  email?: string | null
  logoUrl?: string | null
  currency?: string | null
  timezone?: string | null
  dateFormat?: string | null
  invoicePrefix?: string | null
  nextInvoiceNumber?: number | null
  paymentTermsDays?: number | null
  invoiceNote?: string | null
  paymentInstructions?: string | null
}): CompanySettings {
  const hasStructured =
    Boolean(remote.city?.trim()) ||
    Boolean(remote.state?.trim()) ||
    Boolean(remote.postalCode?.trim())
  const addressParts = (remote.address || "").split(",").map((part) => part.trim())
  const addressLine1 = hasStructured
    ? addressParts[0] || ""
    : remote.country
      ? ""
      : remote.address || ""

  const dateFormat =
    remote.dateFormat === "MM/DD/YYYY" || remote.dateFormat === "YYYY-MM-DD"
      ? remote.dateFormat
      : "DD/MM/YYYY"

  return {
    ...DEFAULT_COMPANY_SETTINGS,
    name: remote.name || "",
    industry: remote.industry || "",
    country: remote.country || "",
    addressLine1,
    addressLine2: "",
    city: remote.city || "",
    state: remote.state || "",
    postalCode: remote.postalCode || "",
    phone: remote.phone || "",
    email: remote.email || "",
    logoUrl: remote.logoUrl || "",
    currency: remote.currency || DEFAULT_COMPANY_SETTINGS.currency,
    timezone: remote.timezone || DEFAULT_COMPANY_SETTINGS.timezone,
    dateFormat,
    invoicePrefix: remote.invoicePrefix || "INV",
    nextInvoiceNumber: remote.nextInvoiceNumber || 1,
    paymentTermsDays:
      typeof remote.paymentTermsDays === "number" ? remote.paymentTermsDays : 30,
    invoiceNote: remote.invoiceNote || "",
    paymentInstructions: remote.paymentInstructions || "",
  }
}
