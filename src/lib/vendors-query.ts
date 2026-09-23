import type { QueryClient } from "@tanstack/react-query"

import { emitVendorsChanged } from "@/lib/vendors"

export const vendorKeys = {
  root: (tenantId: string | undefined) => ["vendors", tenantId] as const,
  list: (tenantId: string | undefined) => ["vendors", tenantId, "list"] as const,
}

export function invalidateVendors(
  queryClient: QueryClient,
  tenantId: string | undefined
) {
  void queryClient.invalidateQueries({ queryKey: vendorKeys.root(tenantId) })
  emitVendorsChanged()
}
