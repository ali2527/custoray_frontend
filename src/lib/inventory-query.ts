import type { QueryClient } from "@tanstack/react-query"

import { emitProductsChanged } from "@/lib/inventory-product-rows"

export type CatalogKind = "brands" | "categories" | "variants"

export const inventoryKeys = {
  root: (tenantId: string | undefined) => ["inventory", tenantId] as const,
  products: (tenantId: string | undefined) =>
    ["inventory", tenantId, "products"] as const,
  facets: (tenantId: string | undefined) =>
    ["inventory", tenantId, "facets"] as const,
  catalog: (kind: CatalogKind, tenantId: string | undefined) =>
    ["inventory", tenantId, kind] as const,
}

function isCatalogListKey(queryKey: readonly unknown[]) {
  const kind = queryKey[2]
  return kind === "brands" || kind === "categories" || kind === "variants"
}

export function invalidateInventory(
  queryClient: QueryClient,
  tenantId: string | undefined,
  options?: { refetchCatalog?: boolean }
) {
  void queryClient.invalidateQueries({
    queryKey: inventoryKeys.root(tenantId),
    predicate: (query) =>
      options?.refetchCatalog === false
        ? !isCatalogListKey(query.queryKey)
        : true,
  })
  emitProductsChanged()
}

type CatalogCacheRow = { id: string; srNo: number }

/** Drop deleted catalog rows immediately, then invalidate every inventory query. */
export async function applyCatalogDelete<T extends CatalogCacheRow>(
  queryClient: QueryClient,
  kind: CatalogKind,
  tenantId: string | undefined,
  deletedIds: string[]
) {
  if (deletedIds.length === 0) return
  const catalogKey = inventoryKeys.catalog(kind, tenantId)
  await queryClient.cancelQueries({ queryKey: catalogKey })
  queryClient.setQueryData<T[] | undefined>(catalogKey, (current) => {
    if (!current) return current
    const removed = new Set(deletedIds)
    return current
      .filter((row) => row.id && !removed.has(row.id))
      .map((row, index) => ({ ...row, srNo: index + 1 }))
  })
  invalidateInventory(queryClient, tenantId, { refetchCatalog: false })
}
