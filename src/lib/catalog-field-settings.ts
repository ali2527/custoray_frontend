export const CATALOG_FIELD_SETTINGS_STORAGE_KEY =
  "custoray-catalog-field-settings-v1"
export const CATALOG_FIELD_SETTINGS_EVENT = "custoray-catalog-field-settings"

export type CatalogLink = "brand" | "category" | "variant"
export type CatalogKind = "brands" | "categories" | "variants"

export const CATALOG_LINKS: CatalogLink[] = ["brand", "category", "variant"]

export const CATALOG_KIND_TO_LINK: Record<CatalogKind, CatalogLink> = {
  brands: "brand",
  categories: "category",
  variants: "variant",
}

export type CatalogTablesSettings = {
  brand: boolean
  category: boolean
  variant: boolean
}

export type CatalogFieldSettings = CatalogTablesSettings

export const DEFAULT_CATALOG_FIELD_SETTINGS: CatalogTablesSettings = {
  brand: true,
  category: true,
  variant: true,
}

function parseEnabled(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value
  if (value === "off" || value === "hidden" || value === "disabled") return false
  if (
    value === "on" ||
    value === "optional" ||
    value === "required" ||
    value === "shown" ||
    value === "enabled"
  ) {
    return true
  }
  return fallback
}

export function parseCatalogFieldSettings(
  raw: string | null
): CatalogTablesSettings | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object") return null
    const value = parsed as Record<string, unknown>
    const productRaw =
      value.product && typeof value.product === "object"
        ? (value.product as Record<string, unknown>)
        : {}
    return {
      brand: parseEnabled(
        value.brand ?? productRaw.brand,
        DEFAULT_CATALOG_FIELD_SETTINGS.brand
      ),
      category: parseEnabled(
        value.category ?? productRaw.category,
        DEFAULT_CATALOG_FIELD_SETTINGS.category
      ),
      variant: parseEnabled(
        value.variant ?? productRaw.variant,
        DEFAULT_CATALOG_FIELD_SETTINGS.variant
      ),
    }
  } catch {
    return null
  }
}

function cloneSettings(
  settings: CatalogTablesSettings = DEFAULT_CATALOG_FIELD_SETTINGS
): CatalogTablesSettings {
  return {
    brand: settings.brand,
    category: settings.category,
    variant: settings.variant,
  }
}

export function loadCatalogFieldSettings(): CatalogTablesSettings {
  if (typeof window === "undefined") return cloneSettings()
  return (
    parseCatalogFieldSettings(
      window.localStorage.getItem(CATALOG_FIELD_SETTINGS_STORAGE_KEY)
    ) ?? cloneSettings()
  )
}

export function saveCatalogFieldSettings(settings: CatalogTablesSettings) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(
    CATALOG_FIELD_SETTINGS_STORAGE_KEY,
    JSON.stringify(settings)
  )
  window.dispatchEvent(new Event(CATALOG_FIELD_SETTINGS_EVENT))
}

export function productCatalogImportSelect(
  catalog: { brands: string[]; categories: string[]; variants: string[] },
  settings: CatalogTablesSettings
): { selectColumns: Record<string, string[]>; requiredSelectColumns: string[] } {
  const selectColumns: Record<string, string[]> = {}
  if (settings.brand) selectColumns.brand = catalog.brands
  if (settings.category) {
    selectColumns.category = catalog.categories
    selectColumns.model = catalog.categories
  }
  if (settings.variant) {
    selectColumns.variant = catalog.variants
    selectColumns.varient = catalog.variants
  }
  return { selectColumns, requiredSelectColumns: [] }
}

export function productImportCatalogColumns(
  tables: CatalogTablesSettings = DEFAULT_CATALOG_FIELD_SETTINGS
): string[] {
  const columns: string[] = []
  if (tables.brand) columns.push("brand")
  if (tables.category) columns.push("category")
  if (tables.variant) columns.push("variant")
  return columns
}
