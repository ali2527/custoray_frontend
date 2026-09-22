import type { QueryClient } from "@tanstack/react-query"

import { emitExpensesChanged } from "@/lib/expenses"

export const expenseKeys = {
  root: (tenantId: string | undefined) => ["expenses", tenantId] as const,
  list: (tenantId: string | undefined) => ["expenses", tenantId, "list"] as const,
}

export function invalidateExpenses(
  queryClient: QueryClient,
  tenantId: string | undefined
) {
  void queryClient.invalidateQueries({ queryKey: expenseKeys.root(tenantId) })
  emitExpensesChanged()
}
