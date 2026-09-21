import { z } from "zod"

import {
  DEFAULT_PRODUCT_SKU_SETTINGS,
  nextAutoSku,
  type ProductSkuSettings,
} from "./product-sku-settings"
import {
  DEFAULT_CATALOG_FIELD_SETTINGS,
  type CatalogTablesSettings,
} from "./catalog-field-settings"

export const INVENTORY_PRODUCTS_STORAGE_KEY = "custoray-inventory-products-v1"
export const PRODUCTS_CHANGED_EVENT = "custoray-products-changed"
export const MIN_PRICE = 100
export const MAX_PRICE = 10000
export const MAX_PRODUCT_IMAGES = 8
export const PRODUCT_VARIANTS = ["Genuine", "1st Copy", "2nd Copy", "Others"] as const
export const PRODUCT_LIFECYCLE_OPTIONS = ["active", "inactive", "archived"] as const
export type ProductLifecycle = (typeof PRODUCT_LIFECYCLE_OPTIONS)[number]

export function clampPriceValue(value: number): number {
  return Math.min(MAX_PRICE, Math.max(MIN_PRICE, value))
}

export function normalizePriceValue(
  value: string | number | null | undefined,
  fallback: number = MIN_PRICE
): string {
  const parsed =
    typeof value === "string" && value.trim() === "" ? Number.NaN : Number(value)
  const finalValue = Number.isFinite(parsed) ? parsed : fallback
  return clampPriceValue(finalValue).toFixed(2)
}

export const productSchema = z.object({
  id: z.string().optional(),
  srNo: z.number(),
  sku: z.string(),
  name: z.string(),
  brand: z.string(),
  category: z.string(),
  variant: z.string(),
  status: z.string(),
  productStatus: z.enum(["active", "none"]).default("none"),
  stock: z.number(),
  orders: z.number(),
  costPrice: z.string(),
  salePrice: z.string(),
  lifecycle: z.enum(PRODUCT_LIFECYCLE_OPTIONS).default("active"),
  imageUrls: z.array(z.string()).default([]),
})

export type ProductRow = z.infer<typeof productSchema>

export const productTabValues = ["all", "active", "inactive", "archived"] as const

export function productTabFilter(row: ProductRow, tab: string) {
  if (tab === "all") return true
  return row.lifecycle === tab
}

export function filterProductRows(
  rows: ProductRow[],
  tab: string,
  search = ""
) {
  const query = search.trim().toLowerCase()
  return rows.filter((row) => {
    if (!productTabFilter(row, tab)) return false
    if (!query) return true
    return [row.name, row.sku, row.brand, row.category, row.variant, row.lifecycle]
      .some((value) => String(value).toLowerCase().includes(query))
  })
}

export function parseProductLifecycle(
  raw: unknown,
  fallback: ProductRow["lifecycle"] = "active"
): ProductRow["lifecycle"] {
  const parsed = parseImportedProductLifecycle(String(raw ?? ""))
  return parsed || fallback
}

export function parseImportedProductLifecycle(
  raw: string | undefined
): ProductLifecycle | "" {
  const value = (raw ?? "").trim().toLowerCase().replace(/\s+/g, "_")
  if (!value) return ""
  if (value === "in_stock" || value === "low_stock" || value === "out_of_stock") {
    return ""
  }
  if (
    value === "active" ||
    value === "inactive" ||
    value === "archived"
  ) {
    return value
  }
  return ""
}

export function parseImageUrls(
  raw: string | null | undefined,
  fallback: string[] = []
): string[] {
  if (raw == null || String(raw).trim() === "") return fallback
  try {
    const parsed = JSON.parse(String(raw)) as unknown
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item): item is string => typeof item === "string" && item.length > 0
      )
    }
  } catch {
    /* ignore */
  }
  return fallback
}

export function removeProductImageAt(urls: string[], index: number): string[] {
  if (!Number.isInteger(index) || index < 0 || index >= urls.length) {
    return urls.slice()
  }
  return urls.filter((_, current) => current !== index)
}

export function productImageUploadValue(urls: string[]): string {
  return JSON.stringify(
    urls.filter((url) => typeof url === "string" && url.trim().length > 0)
  )
}

export function uniqueSorted(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b))
}

export function nextProductSrNo(existing: ProductRow[]): number {
  return existing.reduce((max, row) => Math.max(max, row.srNo), 0) + 1
}

export type ImportCatalogOptions = {
  brands?: string[]
  categories?: string[]
  variants?: string[]
  tables?: CatalogTablesSettings
}

export function matchCatalogOption(
  raw: string | undefined,
  options?: string[]
): { value: string; unmatched: string | null } {
  const value = (raw ?? "").trim()
  if (!value) return { value: "", unmatched: null }
  if (!options) return { value, unmatched: null }
  const match = options.find(
    (option) => option.trim().toLowerCase() === value.toLowerCase()
  )
  if (match) return { value: match, unmatched: null }
  return { value: "", unmatched: value }
}

function resolveImportedCatalogLink(
  raw: string | undefined,
  options: string[] | undefined,
  enabled: boolean,
  onUnmatched?: (name: string) => void
): string {
  if (!enabled) return ""
  const matched = matchCatalogOption(raw, options)
  if (matched.unmatched) onUnmatched?.(matched.unmatched)
  return matched.value
}

export function mapImportedProduct(
  row: Record<string, string>,
  existing: ProductRow[],
  skuSettings: ProductSkuSettings = DEFAULT_PRODUCT_SKU_SETTINGS,
  catalog?: ImportCatalogOptions,
  onUnmatchedCatalog?: (name: string) => void
): ProductRow | null {
  const name = (row.name ?? "").trim()
  const fileSku = (row.sku ?? "").trim()
  if (skuSettings.mode === "auto") {
    if (!name) return null
  } else if (!fileSku) {
    return null
  }
  const finalSr = nextProductSrNo(existing)
  const importedSalePrice =
    row.salePrice ?? row["sale price"] ?? row["sale_price"] ?? row.price
  const normalizedSalePrice = normalizePriceValue(importedSalePrice, MIN_PRICE)
  const importedCostPrice =
    row.costPrice ?? row.costprice ?? row["cost price"] ?? row["cost_price"]
  const normalizedCostPrice = normalizePriceValue(
    importedCostPrice,
    Number(normalizedSalePrice) * 0.8
  )
  const stock = Math.max(0, Number(row.stock ?? row.qty ?? 0) || 0)
  const tables = catalog?.tables ?? DEFAULT_CATALOG_FIELD_SETTINGS
  const brand = resolveImportedCatalogLink(
    row.brand,
    catalog?.brands,
    tables.brand,
    onUnmatchedCatalog
  )
  const category = resolveImportedCatalogLink(
    row.category ?? row.model,
    catalog?.categories,
    tables.category,
    onUnmatchedCatalog
  )
  const variant = resolveImportedCatalogLink(
    row.variant ?? row.varient,
    catalog?.variants,
    tables.variant,
    onUnmatchedCatalog
  )
  const lifecycleRaw = (row.lifecycle ?? "").trim()
  const parsedLifecycle = parseImportedProductLifecycle(lifecycleRaw)
  if (lifecycleRaw && !parsedLifecycle) return null
  return {
    srNo: finalSr,
    sku:
      skuSettings.mode === "auto"
        ? nextAutoSku(existing, skuSettings.prefix)
        : fileSku,
    name: name || fileSku,
    brand,
    category,
    variant,
    status: stock <= 0 ? "Out of Stock" : stock < 10 ? "Low Stock" : "In Stock",
    productStatus: "none",
    stock,
    orders: 0,
    costPrice: normalizedCostPrice,
    salePrice: normalizedSalePrice,
    lifecycle: parsedLifecycle || "active",
    imageUrls: parseImageUrls(row.imageUrls, []),
  }
}

export function stockStatusFromQuantity(qty: number): string {
  if (qty <= 0) return "Out of Stock"
  if (qty < 10) return "Low Stock"
  return "In Stock"
}

export function mapApiProductToRow(product: {
  id: string
  srNo: number
  sku: string
  name: string
  status?: string
  productStatus?: string
  lifecycle?: string
  stock?: number
  ordersCount?: number
  costPrice?: string | number
  salePrice?: string | number
  imageUrls?: unknown
  brand?: { name: string } | null
  category?: { name: string } | null
  variant?: { name: string } | null
}): ProductRow {
  const stock = Number(product.stock) || 0
  const lc = (product.lifecycle ?? "active").toLowerCase()
  const lifecycle =
    lc === "inactive" || lc === "archived" ? lc : "active"
  const imageUrls = Array.isArray(product.imageUrls)
    ? product.imageUrls.filter((url): url is string => typeof url === "string")
    : []
  return {
    id: product.id,
    srNo: product.srNo,
    sku: product.sku,
    name: product.name,
    brand: product.brand?.name ?? "",
    category: product.category?.name ?? "",
    variant: product.variant?.name ?? "",
    status: product.status || stockStatusFromQuantity(stock),
    productStatus: product.productStatus === "active" ? "active" : "none",
    stock,
    orders: Number(product.ordersCount) || 0,
    costPrice: normalizePriceValue(product.costPrice, MIN_PRICE),
    salePrice: normalizePriceValue(product.salePrice, MIN_PRICE),
    lifecycle,
    imageUrls,
  }
}

export function toApiProductWrite(row: ProductRow) {
  return {
    sku: row.sku.trim(),
    name: row.name.trim(),
    brandName: row.brand.trim() || null,
    categoryName: row.category.trim() || null,
    variantName: row.variant.trim() || null,
    status: row.status,
    productStatus: row.productStatus,
    lifecycle: row.lifecycle,
    stock: row.stock,
    costPrice: Number(row.costPrice),
    salePrice: Number(row.salePrice),
    imageUrls: (row.imageUrls ?? []).filter(
      (url) => typeof url === "string" && url.trim().length > 0
    ),
  }
}

export function emitProductsChanged() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(PRODUCTS_CHANGED_EVENT))
}

export function inventoryProductsStorageKey(tenantId?: string | null) {
  if (!tenantId) return null
  return `${INVENTORY_PRODUCTS_STORAGE_KEY}:${tenantId}`
}

export function cacheInventoryProducts(
  rows: ProductRow[],
  tenantId?: string | null
) {
  if (typeof window === "undefined") return
  const key = inventoryProductsStorageKey(tenantId)
  if (!key) return
  try {
    window.localStorage.removeItem(INVENTORY_PRODUCTS_STORAGE_KEY)
    window.localStorage.setItem(key, JSON.stringify(rows))
  } catch {
    /* ignore quota */
  }
}

export function loadCachedInventoryProducts(
  tenantId?: string | null
): ProductRow[] | null {
  if (typeof window === "undefined") return null
  const key = inventoryProductsStorageKey(tenantId)
  if (!key) return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed = productSchema.array().safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export function applyImportedProductRows(
  existing: ProductRow[],
  rows: Record<string, string>[],
  skuSettings: ProductSkuSettings = DEFAULT_PRODUCT_SKU_SETTINGS
): { next: ProductRow[]; added: number } {
  let acc = [...existing]
  let added = 0
  for (const row of rows) {
    const mapped = mapImportedProduct(row, acc, skuSettings)
    if (mapped) {
      acc = [...acc, mapped]
      added += 1
    }
  }
  return { next: acc, added }
}

export const EMPTY_PRODUCT: ProductRow = {
  srNo: 0,
  sku: "",
  name: "",
    brand: "",
    category: "",
    variant: "",
  status: "Out of Stock",
  productStatus: "none",
  stock: 0,
  orders: 0,
  costPrice: "100.00",
  salePrice: "100.00",
  lifecycle: "active",
  imageUrls: [],
}

export type ProductFormOptions = {
  skuSettings?: ProductSkuSettings
  existing?: ProductRow[]
  isNew?: boolean
}

export function productFromSidebarForm(
  fd: FormData,
  previous: ProductRow,
  options: ProductFormOptions = {}
): ProductRow {
  const skuSettings = options.skuSettings ?? DEFAULT_PRODUCT_SKU_SETTINGS
  const existing = options.existing ?? []
  const isNew = options.isNew ?? previous.srNo === 0
  const salePrice = normalizePriceValue(
    String(fd.get("salePrice") ?? previous.salePrice),
    Number(previous.salePrice) || MIN_PRICE
  )
  let sku = previous.sku
  if (skuSettings.mode === "custom") {
    sku = String(fd.get("sku") ?? previous.sku).trim() || previous.sku
  } else if (isNew) {
    sku = nextAutoSku(existing, skuSettings.prefix)
  }
  const stock = fd.has("stock") ? Math.max(0, Number(fd.get("stock")) || 0) : previous.stock
  const status =
    stock <= 0 ? "Out of Stock" : stock < 10 ? "Low Stock" : "In Stock"
  return {
    ...previous,
    sku,
    name: String(fd.get("name") ?? previous.name).trim() || previous.name,
    brand: String(fd.get("brand") ?? previous.brand).trim(),
    category: String(fd.get("category") ?? previous.category).trim(),
    variant: String(fd.get("variant") ?? previous.variant).trim(),
    status,
    stock,
    orders: fd.has("orders") ? Number(fd.get("orders")) || 0 : previous.orders,
    costPrice: normalizePriceValue(
      String(fd.get("costPrice") ?? previous.costPrice),
      Number(salePrice) * 0.8
    ),
    salePrice,
    lifecycle: fd.has("lifecycle")
      ? parseProductLifecycle(fd.get("lifecycle"), previous.lifecycle)
      : previous.lifecycle,
    imageUrls: parseImageUrls(
      fd.has("imageUrls") ? String(fd.get("imageUrls")) : null,
      previous.imageUrls ?? []
    ),
  }
}

export function duplicateProductRow(
  source: ProductRow,
  existing: ProductRow[],
  skuSettings: ProductSkuSettings = DEFAULT_PRODUCT_SKU_SETTINGS
): ProductRow {
  return {
    ...source,
    id: undefined,
    srNo: nextProductSrNo(existing),
    sku:
      skuSettings.mode === "auto"
        ? nextAutoSku(existing, skuSettings.prefix)
        : source.sku
          ? `${source.sku}-copy`
          : "",
    name: source.name ? `${source.name} (copy)` : source.name,
  }
}

export function countAcceptedImageFiles(
  files: { type: string }[],
  currentCount: number,
  max = MAX_PRODUCT_IMAGES
): { accepted: number; skippedNonImage: number; skippedOverLimit: number } {
  const remaining = Math.max(0, max - currentCount)
  let accepted = 0
  let skippedNonImage = 0
  let skippedOverLimit = 0
  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      skippedNonImage += 1
      continue
    }
    if (accepted >= remaining) {
      skippedOverLimit += 1
      continue
    }
    accepted += 1
  }
  return { accepted, skippedNonImage, skippedOverLimit }
}
