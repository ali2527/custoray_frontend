import { apiListProducts, type ApiProduct } from "@/lib/api/business"
import type { ProductRow } from "@/lib/products"

export type SearchProductRow = ProductRow & { apiId: string }

/** Map API product to the ProductRow shape used by sales/purchases forms. */
export function mapApiProductForSearch(product: ApiProduct): SearchProductRow {
  const lifecycle =
    product.lifecycle === "inactive" || product.lifecycle === "archived"
      ? product.lifecycle
      : "active"
  return {
    id: product.srNo,
    srNo: product.srNo,
    sku: product.sku,
    name: product.name,
    brand: product.brand?.name ?? "",
    category: product.category?.name ?? "General",
    variant: product.variant?.name ?? "Others",
    status: product.status,
    productStatus: product.productStatus === "active" ? "active" : "none",
    lifecycle,
    stock: Number(product.stock) || 0,
    orders: product.ordersCount ?? 0,
    costPrice: String(product.costPrice ?? "0"),
    salePrice: String(product.salePrice ?? "0"),
    imageUrls: Array.isArray(product.imageUrls)
      ? product.imageUrls.filter((url): url is string => typeof url === "string")
      : [],
    apiId: product.id,
  }
}

export type SearchProductsResult = {
  items: SearchProductRow[]
  total: number
}

/** Server-side product search (name/sku). Shared by hooks and selects. */
export async function searchProducts(
  query: string,
  options?: { limit?: number; page?: number }
): Promise<SearchProductsResult> {
  const res = await apiListProducts({
    search: query,
    limit: options?.limit ?? 50,
    page: options?.page ?? 1,
  })
  return {
    items: (res.items ?? []).map(mapApiProductForSearch),
    total: res.total ?? 0,
  }
}
