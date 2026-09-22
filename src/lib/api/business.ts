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

export type ApiVendor = {
  id: string
  name: string
  phone?: string
  description?: string
  status?: string
  openingBalance?: string
  imageUrl?: string
  totalPurchases?: string
  totalPayments?: string
}

export type ApiVendorWrite = {
  name: string
  phone?: string
  description?: string
  status?: "active" | "inactive"
  openingBalance?: number
  imageUrl?: string
}

export type ApiVendorBulkResult = {
  items: ApiVendor[]
  added: number
  errors?: { name: string; message: string }[]
}

const VENDOR_LIST_LIMIT = 200
const VENDOR_BULK_LIMIT = 100

export async function apiListVendors(params?: {
  page?: number
  limit?: number
  search?: string
}) {
  const q = new URLSearchParams()
  const page = Math.max(1, Math.floor(params?.page ?? 1))
  const limit = Math.min(VENDOR_LIST_LIMIT, Math.max(1, Math.floor(params?.limit ?? 50)))
  q.set("page", String(page))
  q.set("limit", String(limit))
  const search = params?.search?.trim().replace(/[%_]/g, "").slice(0, 100)
  if (search) q.set("search", search)
  return apiFetch<{ items: ApiVendor[]; total: number }>(`/vendors?${q}`)
}

export async function apiListAllVendors() {
  const pageSize = VENDOR_LIST_LIMIT
  let page = 1
  const items: ApiVendor[] = []
  let total = 0
  while (true) {
    const res = await apiListVendors({ page, limit: pageSize })
    total = res.total ?? 0
    items.push(...(res.items ?? []))
    if (items.length >= total || (res.items ?? []).length < pageSize) break
    page += 1
    if (page > 100) break
  }
  return items
}

export async function apiCreateVendor(data: ApiVendorWrite) {
  return apiFetch<ApiVendor>("/vendors", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function apiUpdateVendor(id: string, data: Partial<ApiVendorWrite>) {
  return apiFetch<ApiVendor>(`/vendors/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function apiDeleteVendor(id: string) {
  return apiFetch<null>(`/vendors/${id}`, { method: "DELETE" })
}

export async function apiBulkCreateVendors(items: ApiVendorWrite[]) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiClientError(400, "VALIDATION_ERROR", "No vendors to import")
  }
  if (items.length > VENDOR_BULK_LIMIT) {
    throw new ApiClientError(
      400,
      "VALIDATION_ERROR",
      `You can import at most ${VENDOR_BULK_LIMIT} vendors at a time`
    )
  }
  return apiFetch<ApiVendorBulkResult>("/vendors/bulk", {
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

export type ApiPaymentType = "CUSTOMER" | "VENDOR"
export type ApiPaymentStatus = "pending" | "completed" | "voided"

export type ApiPayment = {
  id: string
  paymentNumber: string
  type: ApiPaymentType
  partyId: string
  partyName: string
  referenceNumber: string
  paymentDate: string
  amount: string
  paymentMethod: string
  status: ApiPaymentStatus
  notes: string
}

export type ApiPaymentWrite = {
  type: ApiPaymentType
  partyId: string
  partyName?: string
  paymentNumber?: string
  referenceNumber?: string
  paymentDate: string
  amount: number
  paymentMethod?: string
  notes?: string
  status?: ApiPaymentStatus
}

export type ApiPaymentBulkResult = {
  items: ApiPayment[]
  added: number
  errors?: { name: string; message: string }[]
}

const PAYMENT_LIST_LIMIT = 200
const PAYMENT_BULK_LIMIT = 100

export async function apiListPayments(params?: {
  page?: number
  limit?: number
  type?: ApiPaymentType
}) {
  const q = new URLSearchParams()
  const page = Math.max(1, Math.floor(params?.page ?? 1))
  const limit = Math.min(PAYMENT_LIST_LIMIT, Math.max(1, Math.floor(params?.limit ?? 50)))
  q.set("page", String(page))
  q.set("limit", String(limit))
  if (params?.type) q.set("type", params.type)
  return apiFetch<{ items: ApiPayment[]; total: number }>(`/payments?${q}`)
}

export async function apiListAllPayments(type?: ApiPaymentType) {
  const pageSize = PAYMENT_LIST_LIMIT
  let page = 1
  const items: ApiPayment[] = []
  let total = 0
  while (true) {
    const res = await apiListPayments({ page, limit: pageSize, type })
    total = res.total ?? 0
    items.push(...(res.items ?? []))
    if (items.length >= total || (res.items ?? []).length < pageSize) break
    page += 1
    if (page > 100) break
  }
  return items
}

export async function apiCreatePayment(data: ApiPaymentWrite) {
  return apiFetch<ApiPayment>("/payments", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function apiUpdatePayment(id: string, data: Partial<ApiPaymentWrite>) {
  return apiFetch<ApiPayment>(`/payments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function apiDeletePayment(id: string) {
  return apiFetch<null>(`/payments/${id}`, { method: "DELETE" })
}

export async function apiVoidPayment(id: string) {
  return apiFetch<ApiPayment>(`/payments/${id}/void`, { method: "POST" })
}

export async function apiBulkCreatePayments(items: ApiPaymentWrite[]) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiClientError(400, "VALIDATION_ERROR", "No payments to import")
  }
  if (items.length > PAYMENT_BULK_LIMIT) {
    throw new ApiClientError(
      400,
      "VALIDATION_ERROR",
      `You can import at most ${PAYMENT_BULK_LIMIT} payments at a time`
    )
  }
  return apiFetch<ApiPaymentBulkResult>("/payments/bulk", {
    method: "POST",
    body: JSON.stringify({ items }),
  })
}

export type ApiExpenseType = {
  id: string
  name: string
  description: string
  status: "active" | "inactive"
  expensesCount?: number
}

export type ApiExpenseTypeWrite = {
  name: string
  description?: string
  status?: "active" | "inactive"
}

export type ApiExpenseTypeBulkResult = {
  items: ApiExpenseType[]
  added: number
  errors?: { name: string; message: string }[]
}

export type ApiExpenseStatus = "pending" | "paid" | "voided"

export type ApiExpense = {
  id: string
  expenseNumber: string
  typeId: string
  typeName: string
  payeeName: string
  expenseDate: string
  amount: string
  paymentMethod: string
  status: ApiExpenseStatus
  notes: string
}

export type ApiExpenseWrite = {
  typeId: string
  typeName?: string
  expenseNumber?: string
  payeeName?: string
  expenseDate: string
  amount: number
  paymentMethod?: string
  notes?: string
  status?: ApiExpenseStatus
}

export type ApiExpenseBulkResult = {
  items: ApiExpense[]
  added: number
  errors?: { name: string; message: string }[]
}

const EXPENSE_LIST_LIMIT = 200
const EXPENSE_BULK_LIMIT = 100

export async function apiListExpenseTypes(params?: { page?: number; limit?: number }) {
  const q = new URLSearchParams()
  const page = Math.max(1, Math.floor(params?.page ?? 1))
  const limit = Math.min(EXPENSE_LIST_LIMIT, Math.max(1, Math.floor(params?.limit ?? 50)))
  q.set("page", String(page))
  q.set("limit", String(limit))
  return apiFetch<{ items: ApiExpenseType[]; total: number }>(`/expense-types?${q}`)
}

export async function apiListAllExpenseTypes() {
  const pageSize = EXPENSE_LIST_LIMIT
  let page = 1
  const items: ApiExpenseType[] = []
  let total = 0
  while (true) {
    const res = await apiListExpenseTypes({ page, limit: pageSize })
    total = res.total ?? 0
    items.push(...(res.items ?? []))
    if (items.length >= total || (res.items ?? []).length < pageSize) break
    page += 1
    if (page > 100) break
  }
  return items
}

export async function apiCreateExpenseType(data: ApiExpenseTypeWrite) {
  return apiFetch<ApiExpenseType>("/expense-types", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function apiUpdateExpenseType(id: string, data: Partial<ApiExpenseTypeWrite>) {
  return apiFetch<ApiExpenseType>(`/expense-types/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function apiDeleteExpenseType(id: string) {
  return apiFetch<null>(`/expense-types/${id}`, { method: "DELETE" })
}

export async function apiBulkCreateExpenseTypes(items: ApiExpenseTypeWrite[]) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiClientError(400, "VALIDATION_ERROR", "No expense types to import")
  }
  if (items.length > EXPENSE_BULK_LIMIT) {
    throw new ApiClientError(
      400,
      "VALIDATION_ERROR",
      `You can import at most ${EXPENSE_BULK_LIMIT} expense types at a time`
    )
  }
  return apiFetch<ApiExpenseTypeBulkResult>("/expense-types/bulk", {
    method: "POST",
    body: JSON.stringify({ items }),
  })
}

export async function apiListExpenses(params?: {
  page?: number
  limit?: number
  typeId?: string
  status?: ApiExpenseStatus
}) {
  const q = new URLSearchParams()
  const page = Math.max(1, Math.floor(params?.page ?? 1))
  const limit = Math.min(EXPENSE_LIST_LIMIT, Math.max(1, Math.floor(params?.limit ?? 50)))
  q.set("page", String(page))
  q.set("limit", String(limit))
  if (params?.typeId) q.set("typeId", params.typeId)
  if (params?.status) q.set("status", params.status)
  return apiFetch<{ items: ApiExpense[]; total: number }>(`/expenses?${q}`)
}

export async function apiListAllExpenses(typeId?: string) {
  const pageSize = EXPENSE_LIST_LIMIT
  let page = 1
  const items: ApiExpense[] = []
  let total = 0
  while (true) {
    const res = await apiListExpenses({ page, limit: pageSize, typeId })
    total = res.total ?? 0
    items.push(...(res.items ?? []))
    if (items.length >= total || (res.items ?? []).length < pageSize) break
    page += 1
    if (page > 100) break
  }
  return items
}

export async function apiCreateExpense(data: ApiExpenseWrite) {
  return apiFetch<ApiExpense>("/expenses", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function apiUpdateExpense(id: string, data: Partial<ApiExpenseWrite>) {
  return apiFetch<ApiExpense>(`/expenses/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function apiDeleteExpense(id: string) {
  return apiFetch<null>(`/expenses/${id}`, { method: "DELETE" })
}

export async function apiBulkCreateExpenses(items: ApiExpenseWrite[]) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiClientError(400, "VALIDATION_ERROR", "No expenses to import")
  }
  if (items.length > EXPENSE_BULK_LIMIT) {
    throw new ApiClientError(
      400,
      "VALIDATION_ERROR",
      `You can import at most ${EXPENSE_BULK_LIMIT} expenses at a time`
    )
  }
  return apiFetch<ApiExpenseBulkResult>("/expenses/bulk", {
    method: "POST",
    body: JSON.stringify({ items }),
  })
}

export async function apiDashboardSummary() {
  return apiFetch<{
    salesThisMonth?: { total: number; count: number }
    purchasesThisMonth?: { total: number; count: number }
    expensesThisMonth?: { total: number; count: number }
    inventory?: { productCount: number; totalUnits: number; lowStockCount: number }
    buyers?: number
    vendors?: number
    pendingOrders?: number
    revenue?: number
    ordersCount?: number
    productsCount?: number
    buyersCount?: number
    lowStockCount?: number
  }>("/dashboard/summary")
}
