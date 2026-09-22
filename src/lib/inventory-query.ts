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

export function invalidateInventory(
  queryClient: QueryClient,
  tenantId: string | undefined
) {
  void queryClient.invalidateQueries({ queryKey: inventoryKeys.root(tenantId) })
  emitProductsChanged()
}
