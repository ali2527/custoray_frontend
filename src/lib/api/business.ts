import { ApiClientError, apiFetch } from "./client"

export type ApiCatalogItem = {
  id: string
  name: string
  description?: string
  status?: string
  products?: number
}

export type ApiProduct = {
  id: string
  srNo: number
  sku: string
  name: string
  brandId: string | null
  categoryId: string | null
  variantId: string | null
  status: string
  productStatus: string
  lifecycle: string
  stock: number
  ordersCount: number
  costPrice: string
  salePrice: string
  imageUrls: string[]
  brand?: { id: string; name: string } | null
  category?: { id: string; name: string } | null
  variant?: { id: string; name: string } | null
}

export type ApiProductWrite = {
  sku: string
  name: string
  brandName?: string | null
  categoryName?: string | null
  variantName?: string | null
  brandId?: string | null
  categoryId?: string | null
  variantId?: string | null
  status?: string
  productStatus?: string
  lifecycle?: "active" | "inactive" | "archived"
  stock?: number
  costPrice?: number
  salePrice?: number
  imageUrls?: string[]
}

const PRODUCT_ID_RE = /^c[a-z0-9]{24,}$/i
const PRODUCT_ID_ALT_RE = /^[a-z0-9_-]{8,64}$/i
const DATA_IMAGE_PREFIX_RE = /^data:image\/(jpeg|jpg|png|webp|gif);base64,/i
const MAX_DATA_IMAGE_CHARS = 1_500_000
const STOCK_STATUSES = new Set(["In Stock", "Low Stock", "Out of Stock"])
const PRODUCT_STATUSES = new Set(["active", "none", "inactive"])
const LIFECYCLES = new Set(["active", "inactive", "archived"])
const PRODUCT_LIST_LIMIT = 200
const PRODUCT_BULK_LIMIT = 100

function productValidationError(message: string): never {
  throw new ApiClientError(400, "VALIDATION_ERROR", message)
}

export function assertProductId(id: string) {
  const trimmed = id.trim()
  if (
    !trimmed ||
    trimmed.length > 64 ||
    !(PRODUCT_ID_RE.test(trimmed) || PRODUCT_ID_ALT_RE.test(trimmed))
  ) {
    productValidationError("Invalid product")
  }
  return trimmed
}

function isAllowedProductImageUrl(value: string) {
  if (value.startsWith("/") && !value.startsWith("//") && value.length <= 2048) {
    return true
  }
  if (DATA_IMAGE_PREFIX_RE.test(value)) {
    return value.length <= MAX_DATA_IMAGE_CHARS
  }
  try {
    const url = new URL(value)
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      value.length <= 2048
    )
  } catch {
    return false
  }
}

function optionalCatalogName(value: string | null | undefined) {
  if (value == null) return value
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, 120) : null
}

function optionalCatalogId(value: string | null | undefined) {
  if (value == null) return value
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, 64) : null
}

function finiteInRange(value: number, min: number, max: number) {
  return Number.isFinite(value) && value >= min && value <= max
}

export function sanitizeProductWrite(
  data: Partial<ApiProductWrite>,
  mode: "create" | "patch"
): Partial<ApiProductWrite> {
  const payload: Partial<ApiProductWrite> = {}

  if (data.sku !== undefined || mode === "create") {
    const sku = (data.sku ?? "").trim().slice(0, 64)
    if (!sku) productValidationError("SKU is required")
    payload.sku = sku
  }
  if (data.name !== undefined || mode === "create") {
    const name = (data.name ?? "").trim().slice(0, 200)
    if (!name) productValidationError("Product name is required")
    payload.name = name
  }
  if (data.brandId !== undefined) payload.brandId = optionalCatalogId(data.brandId)
  if (data.categoryId !== undefined) payload.categoryId = optionalCatalogId(data.categoryId)
  if (data.variantId !== undefined) payload.variantId = optionalCatalogId(data.variantId)
  if (data.brandName !== undefined) payload.brandName = optionalCatalogName(data.brandName)
  if (data.categoryName !== undefined) {
    payload.categoryName = optionalCatalogName(data.categoryName)
  }
  if (data.variantName !== undefined) payload.variantName = optionalCatalogName(data.variantName)
  if (data.status !== undefined) {
    if (!STOCK_STATUSES.has(data.status)) productValidationError("Invalid stock status")
    payload.status = data.status
  }
  if (data.productStatus !== undefined) {
    if (!PRODUCT_STATUSES.has(data.productStatus)) {
      productValidationError("Invalid product status")
    }
    payload.productStatus = data.productStatus
  }
  if (data.lifecycle !== undefined) {
    if (!LIFECYCLES.has(data.lifecycle)) productValidationError("Invalid lifecycle")
    payload.lifecycle = data.lifecycle
  }
  if (data.stock !== undefined) {
    const stock = Number(data.stock)
    if (!Number.isInteger(stock) || !finiteInRange(stock, 0, 1_000_000)) {
      productValidationError("Stock must be between 0 and 1,000,000")
    }
    payload.stock = stock
  }
  if (data.costPrice !== undefined) {
    const costPrice = Number(data.costPrice)
    if (!finiteInRange(costPrice, 0, 1_000_000)) {
      productValidationError("Cost price must be between 0 and 1,000,000")
    }
    payload.costPrice = costPrice
  }
  if (data.salePrice !== undefined) {
    const salePrice = Number(data.salePrice)
    if (!finiteInRange(salePrice, 0, 1_000_000)) {
      productValidationError("Sale price must be between 0 and 1,000,000")
    }
    payload.salePrice = salePrice
  }
  if (data.imageUrls !== undefined) {
    if (!Array.isArray(data.imageUrls) || data.imageUrls.length > 8) {
      productValidationError("At most 8 product images are allowed")
    }
    const imageUrls = data.imageUrls.filter(
      (url) => typeof url === "string" && url.trim().length > 0
    )
    if (imageUrls.some((url) => !isAllowedProductImageUrl(url))) {
      productValidationError("One or more product images are invalid")
    }
    payload.imageUrls = imageUrls
  }

  if (mode === "patch" && Object.keys(payload).length === 0) {
    productValidationError("No fields to update")
  }
  return payload
}

export async function apiListProducts(params?: {
  page?: number
  limit?: number
  search?: string
}) {
  const q = new URLSearchParams()
  const page = Math.max(1, Math.floor(params?.page ?? 1))
  const limit = Math.min(PRODUCT_LIST_LIMIT, Math.max(1, Math.floor(params?.limit ?? 50)))
  q.set("page", String(page))
  q.set("limit", String(limit))
  const search = params?.search?.trim().replace(/[%_]/g, "").slice(0, 100)
  if (search) q.set("search", search)
  return apiFetch<{ items: ApiProduct[]; total: number }>(`/products?${q}`)
}

export async function apiListAllProducts() {
  const pageSize = PRODUCT_LIST_LIMIT
  let page = 1
  const items: ApiProduct[] = []
  let total = 0
  while (true) {
    const res = await apiListProducts({ page, limit: pageSize })
    total = res.total ?? 0
    items.push(...(res.items ?? []))
    if (items.length >= total || (res.items ?? []).length < pageSize) break
    page += 1
    if (page > 100) break
  }
  return items
}

export async function apiCreateProduct(data: ApiProductWrite) {
  return apiFetch<ApiProduct>("/products", {
    method: "POST",
    body: JSON.stringify(sanitizeProductWrite(data, "create")),
  })
}

export async function apiUpdateProduct(id: string, data: Partial<ApiProductWrite>) {
  return apiFetch<ApiProduct>(`/products/${assertProductId(id)}`, {
    method: "PATCH",
    body: JSON.stringify(sanitizeProductWrite(data, "patch")),
  })
}

export type ApiProductPriceEvent = {
  id: string
  productId: string
  sku: string
  field: "sale" | "cost"
  kind: "set" | "increased" | "decreased"
  previousPrice: string | null
  price: string
  createdAt: string
}

export async function apiListProductPriceHistory(id: string) {
  return apiFetch<{ items: ApiProductPriceEvent[] }>(
    `/products/${assertProductId(id)}/price-history`
  )
}

export async function apiDeleteProduct(id: string) {
  return apiFetch<null>(`/products/${assertProductId(id)}`, { method: "DELETE" })
}

export async function apiBulkCreateProducts(items: ApiProductWrite[]) {
  if (!Array.isArray(items) || items.length === 0) {
    productValidationError("No products to import")
  }
  if (items.length > PRODUCT_BULK_LIMIT) {
    productValidationError(`You can import at most ${PRODUCT_BULK_LIMIT} products at a time`)
  }
  const skus = items.map((item) => item.sku.trim().toLowerCase())
  if (new Set(skus).size !== skus.length) {
    productValidationError("Duplicate SKUs in import")
  }
  return apiFetch<{
    items: ApiProduct[]
    added: number
    errors: { sku: string; name: string; message: string }[]
  }>("/products/bulk", {
    method: "POST",
    body: JSON.stringify({
      items: items.map((item) => sanitizeProductWrite(item, "create")),
    }),
  })
}

export async function apiListProductFacets() {
  return apiFetch<{
    brands: { id: string; name: string }[]
    categories: { id: string; name: string }[]
    variants: { id: string; name: string }[]
  }>("/products/facets")
}

export async function apiListBrands() {
  return apiFetch<ApiCatalogItem[]>("/catalog/brands")
}

export async function apiCreateBrand(data: { name: string; description?: string; status?: string }) {
  return apiFetch<ApiCatalogItem>("/catalog/brands", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function apiUpdateBrand(
  id: string,
  data: { name?: string; description?: string; status?: string }
) {
  return apiFetch<ApiCatalogItem>(`/catalog/brands/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function apiDeleteBrand(id: string) {
  return apiFetch<null>(`/catalog/brands/${id}`, { method: "DELETE" })
}

type CatalogWrite = { name: string; description?: string; status?: string }
type CatalogBulkResult = {
  items: ApiCatalogItem[]
  added: number
  errors: { name: string; message: string }[]
}

export async function apiBulkCreateBrands(items: CatalogWrite[]) {
  return apiFetch<CatalogBulkResult>("/catalog/brands/bulk", {
    method: "POST",
    body: JSON.stringify({ items }),
  })
}

export async function apiListCategories() {
  return apiFetch<ApiCatalogItem[]>("/catalog/categories")
}

export async function apiCreateCategory(data: {
  name: string
  description?: string
  status?: string
}) {
  return apiFetch<ApiCatalogItem>("/catalog/categories", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function apiUpdateCategory(
  id: string,
  data: { name?: string; description?: string; status?: string }
) {
  return apiFetch<ApiCatalogItem>(`/catalog/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function apiDeleteCategory(id: string) {
  return apiFetch<null>(`/catalog/categories/${id}`, { method: "DELETE" })
}

export async function apiBulkCreateCategories(items: CatalogWrite[]) {
  return apiFetch<CatalogBulkResult>("/catalog/categories/bulk", {
    method: "POST",
    body: JSON.stringify({ items }),
  })
}

export async function apiListVariants() {
  return apiFetch<ApiCatalogItem[]>("/catalog/variants")
}

export async function apiCreateVariant(data: {
  name: string
  description?: string
  status?: string
}) {
  return apiFetch<ApiCatalogItem>("/catalog/variants", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function apiUpdateVariant(
  id: string,
  data: { name?: string; description?: string; status?: string }
) {
  return apiFetch<ApiCatalogItem>(`/catalog/variants/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function apiDeleteVariant(id: string) {
  return apiFetch<null>(`/catalog/variants/${id}`, { method: "DELETE" })
}

export async function apiBulkCreateVariants(items: CatalogWrite[]) {
  return apiFetch<CatalogBulkResult>("/catalog/variants/bulk", {
    method: "POST",
    body: JSON.stringify({ items }),
  })
}

export type ApiBuyer = {
  id: string
  legacyId: number | null
  name: string
  phone?: string
  description?: string
  status?: string
  openingBalance?: string
  imageUrl?: string
  totalSales?: string
  totalPayments?: string
}

export type ApiBuyerWrite = {
  name: string
  phone?: string
  description?: string
  status?: "active" | "inactive"
  openingBalance?: number
  imageUrl?: string
}

export type ApiBuyerBulkResult = {
  items: ApiBuyer[]
  added: number
  errors?: { name: string; message: string }[]
}

const BUYER_LIST_LIMIT = 200
const BUYER_BULK_LIMIT = 100

export async function apiListBuyers(params?: { page?: number; limit?: number; search?: string }) {
  const q = new URLSearchParams()
  const page = Math.max(1, Math.floor(params?.page ?? 1))
  const limit = Math.min(BUYER_LIST_LIMIT, Math.max(1, Math.floor(params?.limit ?? 50)))
  q.set("page", String(page))
  q.set("limit", String(limit))
  const search = params?.search?.trim().replace(/[%_]/g, "").slice(0, 100)
  if (search) q.set("search", search)
  return apiFetch<{ items: ApiBuyer[]; total: number }>(`/buyers?${q}`)
}

export async function apiListAllBuyers() {
  const pageSize = BUYER_LIST_LIMIT
  let page = 1
  const items: ApiBuyer[] = []
  let total = 0
  while (true) {
    const res = await apiListBuyers({ page, limit: pageSize })
    total = res.total ?? 0
    items.push(...(res.items ?? []))
    if (items.length >= total || (res.items ?? []).length < pageSize) break
    page += 1
    if (page > 100) break
  }
  return items
}

export async function apiCreateBuyer(data: ApiBuyerWrite) {
  return apiFetch<ApiBuyer>("/buyers", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function apiUpdateBuyer(id: string, data: Partial<ApiBuyerWrite>) {
  return apiFetch<ApiBuyer>(`/buyers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function apiDeleteBuyer(id: string) {
  return apiFetch<null>(`/buyers/${id}`, { method: "DELETE" })
}

export async function apiBulkCreateBuyers(items: ApiBuyerWrite[]) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiClientError(400, "VALIDATION_ERROR", "No customers to import")
  }
  if (items.length > BUYER_BULK_LIMIT) {
    throw new ApiClientError(
      400,
      "VALIDATION_ERROR",
      `You can import at most ${BUYER_BULK_LIMIT} customers at a time`
    )
  }
  return apiFetch<ApiBuyerBulkResult>("/buyers/bulk", {
    method: "POST",
    body: JSON.stringify({ items }),
  })
}

export async function apiListOrders(params?: { page?: number; limit?: number }) {
  const q = new URLSearchParams()
  if (params?.page) q.set("page", String(params.page))
  if (params?.limit) q.set("limit", String(params.limit))
  const suffix = q.toString() ? `?${q}` : ""
  return apiFetch<{ items: unknown[]; total: number }>(`/orders${suffix}`)
}

export async function apiDashboardSummary() {
  return apiFetch<{
    revenue: number
    ordersCount: number
    productsCount: number
    buyersCount: number
    lowStockCount: number
  }>("/dashboard/summary")
}
