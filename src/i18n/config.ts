export const SUPPORTED_LANGUAGES = ["en", "ar", "ur"] as const

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export const DEFAULT_LANGUAGE: AppLanguage = "en"

export const RTL_LANGUAGES = new Set<AppLanguage>(["ar", "ur"])

export const I18N_NAMESPACES = [
  "common",
  "nav",
  "settings",
  "auth",
  "inventory",
  "sales",
  "purchases",
  "customers",
  "vendors",
  "payments",
  "expenses",
  "documents",
  "pos",
  "employees",
  "zakat",
  "reports",
  "tax",
  "storefront",
  "plans",
  "returns",
] as const

export type I18nNamespace = (typeof I18N_NAMESPACES)[number]

export const DEFAULT_NS: I18nNamespace = "common"

export function isAppLanguage(value: string): value is AppLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
}

export function isRtlLanguage(language: string) {
  return RTL_LANGUAGES.has(language as AppLanguage)
}

export function dateLocaleForLanguage(language: string): string {
  if (language === "ar") return "ar"
  if (language === "ur") return "ur"
  return "en-GB"
}
