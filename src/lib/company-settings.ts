import { z } from "zod"

export const companySettingsSchema = z.object({
  name: z.string(),
  tagline: z.string(),
  addressLine1: z.string(),
  addressLine2: z.string(),
  phone: z.string(),
  email: z.string(),
  logoUrl: z.string(),
})

export type CompanySettings = z.infer<typeof companySettingsSchema>

export const COMPANY_SETTINGS_STORAGE_KEY = "custoray-company-settings-v1"

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  name: "",
  tagline: "",
  addressLine1: "",
  addressLine2: "",
  phone: "",
  email: "",
  logoUrl: "",
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
