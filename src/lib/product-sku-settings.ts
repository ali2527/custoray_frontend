import { z } from "zod"

import {
  DEFAULT_CATALOG_FIELD_SETTINGS,
  productImportCatalogColumns,
  type CatalogTablesSettings,
} from "./catalog-field-settings"

export const PRODUCT_SKU_SETTINGS_STORAGE_KEY = "custoray-product-sku-settings-v1"
export const PRODUCT_SKU_SETTINGS_EVENT = "custoray-product-sku-settings"

export const productSkuSettingsSchema = z.object({
  mode: z.enum(["auto", "custom"]),
  prefix: z.string(),
})

export type ProductSkuMode = z.infer<typeof productSkuSettingsSchema>["mode"]
export type ProductSkuSettings = z.infer<typeof productSkuSettingsSchema>

export const DEFAULT_PRODUCT_SKU_SETTINGS: ProductSkuSettings = {
  mode: "auto",
  prefix: "SKU",
}

export function sanitizeSkuPrefixInput(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 20)
}

export function normalizeSkuPrefix(prefix: string): string {
  const cleaned = sanitizeSkuPrefixInput(prefix).replace(/[-_]+$/g, "")
  return cleaned || DEFAULT_PRODUCT_SKU_SETTINGS.prefix
}

export function skuHead(prefix: string): string {
  return `${normalizeSkuPrefix(prefix)}-`
}

export function formatAutoSku(prefix: string, n: number, pad = 3): string {
  return `${skuHead(prefix)}${String(Math.max(1, n)).padStart(pad, "0")}`
}

export function nextAutoSku(
  existing: { sku: string }[],
  prefix: string
): string {
  const head = skuHead(prefix)
  const headUpper = head.toUpperCase()
  let max = 0
  for (const row of existing) {
    const sku = row.sku.trim()
    if (!sku.toUpperCase().startsWith(headUpper)) continue
    const rest = sku.slice(head.length)
    if (!/^\d+$/.test(rest)) continue
    max = Math.max(max, Number(rest))
  }
  return formatAutoSku(prefix, max + 1)
}

export function parseProductSkuSettings(raw: string | null): ProductSkuSettings | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    const result = productSkuSettingsSchema.safeParse(parsed)
    if (!result.success) return null
    return {
      mode: result.data.mode,
      prefix: sanitizeSkuPrefixInput(result.data.prefix) || DEFAULT_PRODUCT_SKU_SETTINGS.prefix,
    }
  } catch {
    return null
  }
}

export function loadProductSkuSettings(): ProductSkuSettings {
  if (typeof window === "undefined") return { ...DEFAULT_PRODUCT_SKU_SETTINGS }
  return (
    parseProductSkuSettings(
      window.localStorage.getItem(PRODUCT_SKU_SETTINGS_STORAGE_KEY)
    ) ?? { ...DEFAULT_PRODUCT_SKU_SETTINGS }
  )
}

export function saveProductSkuSettings(settings: ProductSkuSettings) {
  if (typeof window === "undefined") return
  const next: ProductSkuSettings = {
    mode: settings.mode === "custom" ? "custom" : "auto",
    prefix: sanitizeSkuPrefixInput(settings.prefix) || DEFAULT_PRODUCT_SKU_SETTINGS.prefix,
  }
  window.localStorage.setItem(
    PRODUCT_SKU_SETTINGS_STORAGE_KEY,
    JSON.stringify(next)
  )
  window.dispatchEvent(new Event(PRODUCT_SKU_SETTINGS_EVENT))
}

export const PRODUCT_IMPORT_BASE_COLUMNS = [
  "name",
  "brand",
  "category",
  "variant",
  "costPrice",
  "salePrice",
] as const

export function productImportColumns(
  settings: Pick<ProductSkuSettings, "mode">,
  tables: CatalogTablesSettings = DEFAULT_CATALOG_FIELD_SETTINGS
): string[] {
  const catalog = productImportCatalogColumns(tables)
  const base = ["name", ...catalog, "costPrice", "salePrice"]
  if (settings.mode === "custom") {
    return ["sku", ...base]
  }
  return base
}

export function productImportSampleRow(
  settings: ProductSkuSettings,
  tables: CatalogTablesSettings = DEFAULT_CATALOG_FIELD_SETTINGS
): Record<string, string> {
  const row: Record<string, string> = {
    name: "Demo product",
    costPrice: "120.00",
    salePrice: "150.00",
  }
  if (tables.brand) row.brand = "Acme"
  if (tables.category) row.category = "Electronics"
  if (tables.variant) row.variant = "Others"
  if (settings.mode === "custom") {
    row.sku = formatAutoSku(settings.prefix, 1)
  }
  return row
}
