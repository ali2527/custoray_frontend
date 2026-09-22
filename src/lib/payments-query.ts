import type { QueryClient } from "@tanstack/react-query"

import { emitPaymentsChanged } from "@/lib/payments"

export const paymentKeys = {
  root: (tenantId: string | undefined) => ["payments", tenantId] as const,
  list: (tenantId: string | undefined) => ["payments", tenantId, "list"] as const,
}

export function invalidatePayments(
  queryClient: QueryClient,
  tenantId: string | undefined
) {
  void queryClient.invalidateQueries({ queryKey: paymentKeys.root(tenantId) })
  emitPaymentsChanged()
}
