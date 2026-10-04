import { z } from "zod"

import i18n from "@/i18n"
import { formatMoney } from "@/lib/customers"
import {
  computeLineTotal,
  computeOrderTotal,
  type OrderLineRow,
  type OrderRow,
} from "@/lib/orders"
import type { ProductRow } from "@/lib/products"

export const STOREFRONT_SETTINGS_KEY = "custoray-storefront-v1"
export const STOREFRONT_ORDER_DESCRIPTION = "QR storefront order"
export const STOREFRONT_INVOICE_PREFIX = "QR"
export const STOREFRONT_ANY_VALUE = "__any__"

export const storefrontQrPresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  customerId: z.string(),
  brand: z.string(),
  category: z.string(),
  variant: z.string(),
  lock: z.boolean(),
  createdAt: z.string(),
})

export type StorefrontQrPreset = z.infer<typeof storefrontQrPresetSchema>

export const storefrontSettingsSchema = z.object({
  storeId: z.string().min(1),
  enabled: z.boolean(),
  presets: z.array(storefrontQrPresetSchema).default([]),
})

export type StorefrontSettings = z.infer<typeof storefrontSettingsSchema>

export type StorefrontPrefill = {
  customerId: string
  brand: string
  category: string
  variant: string
  lock: boolean
}

export const EMPTY_STOREFRONT_PREFILL: StorefrontPrefill = {
  customerId: "",
  brand: "",
  category: "",
  variant: "",
  lock: false,
}

export type StorefrontCartLine = {
  productId: number
  productName: string
  sku: string
  quantity: number
  unitPrice: string
  maxStock: number
}

function randomHex(byteCount = 6): string {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = new Uint8Array(byteCount)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
  }
  return Math.random()
    .toString(16)
    .slice(2, 2 + byteCount * 2)
    .padEnd(byteCount * 2, "0")
}

export function generateStoreId(): string {
  return `store-${randomHex(6)}`
}

export function generatePresetId(): string {
  return `qr-${randomHex(4)}`
}

export function parseStorefrontSettings(raw: string | null): StorefrontSettings | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    const result = storefrontSettingsSchema.safeParse(parsed)
    return result.success ? result.data : null
  } catch {
    return null
  }
}

export function loadStorefrontSettings(): StorefrontSettings | null {
  if (typeof window === "undefined") return null
  return parseStorefrontSettings(window.localStorage.getItem(STOREFRONT_SETTINGS_KEY))
}

export function saveStorefrontSettings(settings: StorefrontSettings): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STOREFRONT_SETTINGS_KEY, JSON.stringify(settings))
}

export function ensureStorefrontSettings(): StorefrontSettings {
  const existing = loadStorefrontSettings()
  if (existing) return { ...existing, presets: existing.presets ?? [] }
  const created: StorefrontSettings = {
    storeId: generateStoreId(),
    enabled: true,
    presets: [],
  }
  saveStorefrontSettings(created)
  return created
}

export function storefrontPath(storeId: string): string {
  return `/store/${encodeURIComponent(storeId)}`
}

export function hasStorefrontPrefill(
  prefill: Pick<StorefrontPrefill, "customerId" | "brand" | "category" | "variant">
): boolean {
  return Boolean(prefill.customerId || prefill.brand || prefill.category || prefill.variant)
}

export function presetToPrefill(preset: StorefrontQrPreset): StorefrontPrefill {
  return {
    customerId: preset.customerId,
    brand: preset.brand,
    category: preset.category,
    variant: preset.variant,
    lock: preset.lock,
  }
}

export function storefrontSearchParams(prefill: StorefrontPrefill): string {
  const params = new URLSearchParams()
  if (prefill.customerId) params.set("c", prefill.customerId)
  if (prefill.brand) params.set("brand", prefill.brand)
  if (prefill.category) params.set("category", prefill.category)
  if (prefill.variant) params.set("variant", prefill.variant)
  if (prefill.lock) params.set("lock", "1")
  return params.toString()
}

export function storefrontHref(storeId: string, prefill?: StorefrontPrefill): string {
  const path = storefrontPath(storeId)
  if (!prefill) return path
  const query = storefrontSearchParams(prefill)
  return query ? `${path}?${query}` : path
}

export function storefrontUrl(
  origin: string,
  storeId: string,
  prefill?: StorefrontPrefill
): string {
  return `${origin.replace(/\/$/, "")}${storefrontHref(storeId, prefill)}`
}

export function parseStorefrontPrefillFromSearch(
  search: Pick<URLSearchParams, "get">
): StorefrontPrefill {
  return {
    customerId: search.get("c")?.trim() ?? "",
    brand: search.get("brand")?.trim() ?? "",
    category: search.get("category")?.trim() ?? "",
    variant: search.get("variant")?.trim() ?? "",
    lock: search.get("lock") === "1",
  }
}

export function presetDisplayName(
  preset: Pick<StorefrontQrPreset, "name" | "customerId" | "brand" | "category" | "variant">,
  customerName?: string
): string {
  if (preset.name.trim()) return preset.name.trim()
  const parts = [
    customerName,
    preset.brand,
    preset.category,
    preset.variant,
  ].filter((part) => Boolean(part && part !== "—"))
  return parts.join(" · ") || i18n.t("customQr", { ns: "storefront" })
}

export function prefillSummary(
  prefill: StorefrontPrefill,
  customerName?: string
): string[] {
  const parts: string[] = []
  if (customerName) parts.push(customerName)
  if (prefill.brand) parts.push(prefill.brand)
  if (prefill.category) parts.push(prefill.category)
  if (prefill.variant) parts.push(prefill.variant)
  return parts
}

export function qrImageUrl(data: string, size = 280): string {
  const params = new URLSearchParams({
    size: `${size}x${size}`,
    ecc: "M",
    margin: "8",
    data,
  })
  return `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`
}

export function formatStorefrontMoney(value: string): string {
  return formatMoney(value)
}

export function isStorefrontOrder(
  order: Pick<OrderRow, "invoiceNumber" | "description">
): boolean {
  return (
    order.description.startsWith(STOREFRONT_ORDER_DESCRIPTION) ||
    order.invoiceNumber.startsWith(`${STOREFRONT_INVOICE_PREFIX}-`)
  )
}

export function nextStorefrontInvoiceNumber(existing: OrderRow[]): string {
  const pattern = new RegExp(`^${STOREFRONT_INVOICE_PREFIX}-(\\d+)$`)
  const nums = existing.filter(isStorefrontOrder).map((order) => {
    const match = order.invoiceNumber.match(pattern)
    return match ? Number(match[1]) : 0
  })
  const next = (nums.length ? Math.max(...nums) : 1000) + 1
  return `${STOREFRONT_INVOICE_PREFIX}-${next}`
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(
    new Set(values.filter((value) => Boolean(value) && value !== "—"))
  ).sort((a, b) => a.localeCompare(b))
}

export function storefrontFacets(products: ProductRow[]) {
  const catalog = storefrontCatalogProducts(products)
  return {
    brands: uniqueSorted(catalog.map((product) => product.brand)),
    categories: uniqueSorted(catalog.map((product) => product.category)),
    variants: uniqueSorted(catalog.map((product) => product.variant)),
  }
}

export function storefrontCatalogProducts(products: ProductRow[]): ProductRow[] {
  return products
    .filter((product) => product.lifecycle === "active" && product.stock > 0)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function filterStorefrontCatalog(
  products: ProductRow[],
  filters: Pick<StorefrontPrefill, "brand" | "category" | "variant">
): ProductRow[] {
  return storefrontCatalogProducts(products).filter((product) => {
    if (filters.brand && product.brand !== filters.brand) return false
    if (filters.category && product.category !== filters.category) return false
    if (filters.variant && product.variant !== filters.variant) return false
    return true
  })
}

export function cartLineTotal(line: StorefrontCartLine): string {
  return computeLineTotal(line.quantity, line.unitPrice)
}

export function cartSubtotal(cart: StorefrontCartLine[]): string {
  return computeOrderTotal(cart.map((line) => ({ lineTotal: cartLineTotal(line) })))
}

export function cartItemCount(cart: StorefrontCartLine[]): number {
  return cart.reduce((sum, line) => sum + line.quantity, 0)
}

export function storefrontOrderDescription(filters: {
  brand?: string
  category?: string
  variant?: string
}): string {
  const parts = [STOREFRONT_ORDER_DESCRIPTION]
  if (filters.brand) parts.push(filters.brand)
  if (filters.category) parts.push(filters.category)
  if (filters.variant) parts.push(filters.variant)
  return parts.join(" · ")
}

export function buildStorefrontOrderFromCart(
  cart: StorefrontCartLine[],
  options: {
    customerName: string
    invoiceNumber: string
    orderDate?: string
    brand?: string
    category?: string
    variant?: string
  }
): Omit<OrderRow, "id"> {
  const lines: OrderLineRow[] = cart.map((line, index) => ({
    id: index + 1,
    productName: line.productName,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    lineTotal: cartLineTotal(line),
  }))

  const totalAmount = computeOrderTotal(lines)

  return {
    invoiceNumber: options.invoiceNumber,
    customerName: options.customerName.trim(),
    description: storefrontOrderDescription(options),
    orderDate: options.orderDate ?? new Date().toISOString().slice(0, 10),
    totalAmount,
    paidAmount: "0.00",
    paymentMethod: "Credit",
    status: "pending",
    lines,
  }
}
