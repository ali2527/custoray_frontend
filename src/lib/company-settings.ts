import { z } from "zod"

export const companySettingsSchema = z.object({
  name: z.string(),
  tagline: z.string(),
  industry: z.string(),
  website: z.string(),
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

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  name: "",
  tagline: "",
  industry: "",
  website: "",
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
  return DEFAULT_COMPANY_SETTINGS
}

export function saveCompanySettings(_settings: CompanySettings) {}
