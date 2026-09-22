import type { QueryClient } from "@tanstack/react-query"

import { emitExpenseTypesChanged } from "@/lib/expense-types"

export const expenseTypeKeys = {
  root: (tenantId: string | undefined) => ["expense-types", tenantId] as const,
  list: (tenantId: string | undefined) => ["expense-types", tenantId, "list"] as const,
}

export function invalidateExpenseTypes(
  queryClient: QueryClient,
  tenantId: string | undefined
) {
  void queryClient.invalidateQueries({ queryKey: expenseTypeKeys.root(tenantId) })
  emitExpenseTypesChanged()
}
