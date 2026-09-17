import type { QueryClient } from "@tanstack/react-query"

import { emitCustomersChanged } from "@/lib/customers"

export const customerKeys = {
  root: (tenantId: string | undefined) => ["customers", tenantId] as const,
  list: (tenantId: string | undefined) => ["customers", tenantId, "list"] as const,
}

export function invalidateCustomers(
  queryClient: QueryClient,
  tenantId: string | undefined
) {
  void queryClient.invalidateQueries({ queryKey: customerKeys.root(tenantId) })
  emitCustomersChanged()
}
