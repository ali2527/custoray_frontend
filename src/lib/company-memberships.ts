import type { CompanyMembership } from "@/lib/api/auth"

export const COMPANIES_STORAGE_KEY = "custoray-companies-v1"
export const ACTIVE_COMPANY_STORAGE_KEY = "custoray-active-company-v1"

export function loadLocalCompanies(): CompanyMembership[] {
  return []
}

export function saveLocalCompanies(_companies: CompanyMembership[]) {}

export function loadActiveCompanyId(companies: CompanyMembership[]): string | null {
  return companies[0]?.id ?? null
}

export function saveActiveCompanyId(_id: string) {}

export function slugifyCompanyName(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "company"
  )
}
