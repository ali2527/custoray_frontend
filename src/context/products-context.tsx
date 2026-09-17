"use client"

import * as React from "react"
import {
  type ProductRow,
  PRODUCTS_STORAGE_KEY,
  nextSku,
} from "@/lib/products"
import { recordProductPriceChanges } from "@/lib/product-price-history"
import { markSetupMilestone } from "@/lib/setup-progress"
import {
  apiCreateProduct,
  apiDeleteProduct,
  apiListAllProducts,
  apiUpdateProduct,
  type ApiProduct,
  type ApiProductWrite,
} from "@/lib/api/business"
import {
  PRODUCTS_CHANGED_EVENT,
  emitProductsChanged,
} from "@/lib/inventory-product-rows"
import { useAuth } from "@/context/auth-context"

function mapApiProduct(p: ApiProduct): ProductRow {
  const lifecycle =
    p.lifecycle === "inactive" || p.lifecycle === "archived" ? p.lifecycle : "active"
  return {
    id: p.srNo,
    srNo: p.srNo,
    sku: p.sku,
    name: p.name,
    brand: p.brand?.name ?? "",
    category: p.category?.name ?? "General",
    variant: p.variant?.name ?? "Others",
    status: p.status,
    productStatus: p.productStatus === "active" ? "active" : "none",
    lifecycle,
    stock: Number(p.stock) || 0,
    orders: p.ordersCount ?? 0,
    costPrice: String(p.costPrice ?? "0"),
    salePrice: String(p.salePrice ?? "0"),
    imageUrls: Array.isArray(p.imageUrls)
      ? p.imageUrls.filter((url) => typeof url === "string")
      : [],
  }
}

function toWrite(product: Omit<ProductRow, "id" | "srNo">): ApiProductWrite {
  return {
    sku: product.sku.trim(),
    name: product.name.trim(),
    brandName: product.brand.trim() || null,
    categoryName: product.category.trim() || null,
    variantName: product.variant.trim() || null,
    status: product.status,
    productStatus: product.productStatus,
    lifecycle: product.lifecycle,
    stock: product.stock,
    costPrice: Number(product.costPrice) || 0,
    salePrice: Number(product.salePrice) || 0,
    imageUrls: product.imageUrls ?? [],
  }
}

function posProductsStorageKey(tenantId?: string | null) {
  if (!tenantId) return null
  return `${PRODUCTS_STORAGE_KEY}:${tenantId}`
}

function loadCachedPosProducts(tenantId?: string | null): ProductRow[] {
  if (typeof window === "undefined") return []
  const key = posProductsStorageKey(tenantId)
  if (!key) return []
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ProductRow[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function cachePosProducts(rows: ProductRow[], tenantId?: string | null) {
  if (typeof window === "undefined") return
  const key = posProductsStorageKey(tenantId)
  if (!key) return
  try {
    window.localStorage.removeItem(PRODUCTS_STORAGE_KEY)
    window.localStorage.setItem(key, JSON.stringify(rows))
  } catch {
    /* ignore quota */
  }
}

type ProductsContextValue = {
  products: ProductRow[]
  setProducts: React.Dispatch<React.SetStateAction<ProductRow[]>>
  getProduct: (id: number) => ProductRow | undefined
  addProduct: (product: Omit<ProductRow, "id" | "srNo">) => Promise<ProductRow>
  updateProduct: (id: number, patch: Partial<ProductRow>) => void
  removeProduct: (id: number) => void
  loading: boolean
}

const ProductsContext = React.createContext<ProductsContextValue | null>(null)

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const { session, hydrated } = useAuth()
  const tenantId = session?.tenantId
  const [products, setProducts] = React.useState<ProductRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const apiIdBySrNo = React.useRef(new Map<number, string>())
  const productsRef = React.useRef(products)
  productsRef.current = products
  const tenantIdRef = React.useRef(tenantId)
  tenantIdRef.current = tenantId

  const rememberApiId = (product: ApiProduct) => {
    apiIdBySrNo.current.set(product.srNo, product.id)
  }

  const loadFromApi = React.useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true)
    try {
      const items = await apiListAllProducts()
      apiIdBySrNo.current = new Map(items.map((item) => [item.srNo, item.id]))
      const mapped = items.map(mapApiProduct)
      setProducts(mapped)
      cachePosProducts(mapped, tenantIdRef.current)
    } catch {
      if (!opts?.silent) {
        setProducts(loadCachedPosProducts(tenantIdRef.current))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (!hydrated) return
    apiIdBySrNo.current.clear()
    const cached = loadCachedPosProducts(tenantId)
    setProducts(cached)
    void loadFromApi()
  }, [hydrated, tenantId, loadFromApi])

  React.useEffect(() => {
    const onChanged = () => {
      void loadFromApi({ silent: true })
    }
    window.addEventListener(PRODUCTS_CHANGED_EVENT, onChanged)
    return () => window.removeEventListener(PRODUCTS_CHANGED_EVENT, onChanged)
  }, [loadFromApi])

  const getProduct = React.useCallback(
    (id: number) => products.find((p) => p.id === id),
    [products]
  )

  const addProduct = React.useCallback(async (product: Omit<ProductRow, "id" | "srNo">) => {
    const sku = product.sku.trim() || nextSku(productsRef.current)
    const created = await apiCreateProduct(toWrite({ ...product, sku }))
    rememberApiId(created)
    const row = mapApiProduct(created)
    setProducts((prev) => [row, ...prev])
    recordProductPriceChanges(null, row)
    markSetupMilestone("product")
    emitProductsChanged()
    return row
  }, [])

  const updateProduct = React.useCallback((id: number, patch: Partial<ProductRow>) => {
    const current = productsRef.current.find((p) => p.id === id)
    if (!current) return
    const next = { ...current, ...patch, id: current.id, srNo: current.srNo }
    if (
      patch.salePrice !== undefined ||
      patch.costPrice !== undefined ||
      (patch.sku !== undefined && patch.sku !== current.sku)
    ) {
      recordProductPriceChanges(current, next)
    }
    setProducts((prev) => prev.map((p) => (p.id === id ? next : p)))
    cachePosProducts(
      productsRef.current.map((p) => (p.id === id ? next : p)),
      tenantIdRef.current
    )

    const apiId = apiIdBySrNo.current.get(current.srNo)
    if (!apiId) return

    const payload: Partial<ApiProductWrite> = {}
    if (patch.sku !== undefined) payload.sku = next.sku
    if (patch.name !== undefined) payload.name = next.name
    if (patch.brand !== undefined) payload.brandName = next.brand.trim() || null
    if (patch.category !== undefined) {
      payload.categoryName = next.category.trim() || null
    }
    if (patch.variant !== undefined) payload.variantName = next.variant.trim() || null
    if (patch.status !== undefined) payload.status = next.status
    if (patch.productStatus !== undefined) payload.productStatus = next.productStatus
    if (patch.lifecycle !== undefined) payload.lifecycle = next.lifecycle
    if (patch.stock !== undefined) payload.stock = next.stock
    if (patch.costPrice !== undefined) payload.costPrice = Number(next.costPrice)
    if (patch.salePrice !== undefined) payload.salePrice = Number(next.salePrice)
    if (patch.imageUrls !== undefined) payload.imageUrls = next.imageUrls

    if (Object.keys(payload).length === 0) return
    void apiUpdateProduct(apiId, payload).catch(() => {
      /* keep optimistic local stock if the catalog patch fails */
    })
  }, [])

  const removeProduct = React.useCallback((id: number) => {
    const current = productsRef.current.find((p) => p.id === id)
    setProducts((prev) => prev.filter((p) => p.id !== id))
    const apiId = current ? apiIdBySrNo.current.get(current.srNo) : undefined
    if (!apiId) return
    void apiDeleteProduct(apiId)
      .then(() => emitProductsChanged())
      .catch(() => {
        /* keep local removal if already gone on the server */
      })
  }, [])

  const value = React.useMemo(
    () => ({
      products,
      setProducts,
      getProduct,
      addProduct,
      updateProduct,
      removeProduct,
      loading,
    }),
    [products, getProduct, addProduct, updateProduct, removeProduct, loading]
  )

  return (
    <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>
  )
}

export function useProducts() {
  const ctx = React.useContext(ProductsContext)
  if (!ctx) {
    throw new Error("useProducts must be used within ProductsProvider")
  }
  return ctx
}
