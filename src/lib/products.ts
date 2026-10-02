import { z } from "zod"

import rawProducts from "@/app/(app)/inventory/data.json"
import { parseMoney } from "@/lib/customers"

export { parseMoney }

const MIN_PRICE = 100

function clampPriceValue(value: number): number {
  return Math.min(10000, Math.max(MIN_PRICE, value))
}

function normalizePriceValue(
  value: string | number | null | undefined,
  fallback: number = MIN_PRICE
): string {
  const n = Number(String(value ?? "").replace(/[^0-9.-]/g, ""))
  const resolved = Number.isFinite(n) ? n : fallback
  return clampPriceValue(resolved).toFixed(2)
}

export const productSchema = z.object({
  id: z.number(),
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
  lifecycle: z.enum(["active", "inactive", "archived"]).default("active"),
  imageUrls: z.array(z.string()).default([]),
})

export type ProductRow = z.infer<typeof productSchema>

export const PRODUCTS_STORAGE_KEY = "custoray-products-v1"

type RawProductRow = Omit<ProductRow, "id" | "costPrice" | "salePrice" | "category"> & {
  costPrice?: string
  salePrice?: string
  price?: string
  category?: string
  model?: string
  variant?: string
  varient?: string
}

function normalizeRawProduct(row: RawProductRow, index: number): ProductRow {
  const normalizedSalePrice = normalizePriceValue(row.salePrice ?? row.price, MIN_PRICE)
  return {
    id: index + 1,
    srNo: row.srNo ?? index + 1,
    sku: row.sku ?? `SKU-${String(index + 1).padStart(3, "0")}`,
    name: row.name ?? "Unnamed product",
    brand: row.brand ?? "",
    category: row.category ?? row.model ?? "General",
    variant: row.variant ?? row.varient ?? "Others",
    status: row.status ?? "In Stock",
    productStatus: row.productStatus ?? "none",
    stock: row.stock ?? 0,
    orders: row.orders ?? 0,
    costPrice: normalizePriceValue(
      row.costPrice,
      Number(normalizedSalePrice) * 0.8
    ),
    salePrice: normalizedSalePrice,
    lifecycle: row.lifecycle ?? "active",
    imageUrls: row.imageUrls ?? [],
  }
}

export const initialProducts: ProductRow[] = (rawProducts as RawProductRow[]).map(
  normalizeRawProduct
)

export const EMPTY_PRODUCT: ProductRow = {
  id: 0,
  srNo: 0,
  sku: "",
  name: "",
  brand: "",
  category: "General",
  variant: "Others",
  status: "In Stock",
  productStatus: "active",
  stock: 0,
  orders: 0,
  costPrice: MIN_PRICE.toFixed(2),
  salePrice: MIN_PRICE.toFixed(2),
  lifecycle: "active",
  imageUrls: [],
}

export function nextSku(existing: ProductRow[]): string {
  const maxNum = existing.reduce((max, product) => {
    const match = product.sku.match(/(\d+)\s*$/)
    const num = match ? Number(match[1]) : 0
    return Math.max(max, num)
  }, 0)
  return `SKU-${String(maxNum + 1).padStart(3, "0")}`
}

export function productFromFormData(fd: FormData, id: number, existing: ProductRow[]): ProductRow {
  const name = String(fd.get("name") ?? "").trim()
  const sku = String(fd.get("sku") ?? "").trim() || nextSku(existing)
  const salePrice = parseMoney(String(fd.get("salePrice") ?? MIN_PRICE))
  const costPrice = parseMoney(String(fd.get("costPrice") ?? String(Number(salePrice) * 0.8)))

  return {
    id,
    srNo: id,
    sku,
    name,
    brand: String(fd.get("brand") ?? "").trim() || "—",
    category: String(fd.get("category") ?? "").trim() || "General",
    variant: String(fd.get("variant") ?? "").trim() || "Others",
    status: "In Stock",
    productStatus: "active",
    stock: Number(fd.get("stock")) || 0,
    orders: 0,
    costPrice,
    salePrice,
    lifecycle: "active",
    imageUrls: [],
  }
}

export function parsePersistedProducts(raw: string | null): ProductRow[] | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    const result = z.array(productSchema).safeParse(parsed)
    return result.success ? result.data : null
  } catch {
    return null
  }
}

/** Inventory page stores rows without `id`; POS/API catalog needs a ProductRow. */
export const INVENTORY_PRODUCTS_STORAGE_KEY = "custoray-inventory-products-v1"

export function loadStoredProducts(): ProductRow[] {
  return []
}
