"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useAuth } from "@/context/auth-context"
import {
  apiBulkCreateExpenses,
  apiCreateExpense,
  apiDeleteExpense,
  apiListAllExpenses,
  apiUpdateExpense,
} from "@/lib/api/business"
import { expenseKeys, invalidateExpenses } from "@/lib/expenses-query"
import {
  cacheExpenses,
  loadCachedExpenses,
  mapApiExpenseToRow,
  type ExpenseRow,
  type ExpenseWrite,
} from "@/lib/expenses"

function reindex(rows: ExpenseRow[]): ExpenseRow[] {
  return rows.map((item, index) => ({ ...item, id: index + 1 }))
}

export function useExpensesQuery() {
  const { session, hydrated: authHydrated } = useAuth()
  const tenantId = session?.tenantId
  const queryClient = useQueryClient()
  const enabled = authHydrated && Boolean(tenantId)

  const query = useQuery({
    queryKey: expenseKeys.list(tenantId),
    enabled,
    placeholderData: () => loadCachedExpenses(tenantId) ?? undefined,
    queryFn: async () => {
      const items = await apiListAllExpenses()
      const rows = reindex(items.map((item, index) => mapApiExpenseToRow(item, index)))
      cacheExpenses(rows, tenantId)
      return rows
    },
  })

  const expenses = query.data ?? []

  const persistRows = (rows: ExpenseRow[]) => {
    const next = reindex(rows)
    queryClient.setQueryData(expenseKeys.list(tenantId), next)
    cacheExpenses(next, tenantId)
  }

  const createMutation = useMutation({
    mutationFn: (data: ExpenseWrite) => apiCreateExpense(data),
    onSuccess: (saved) => {
      const row = mapApiExpenseToRow(saved, 0)
      const current =
        queryClient.getQueryData<ExpenseRow[]>(expenseKeys.list(tenantId)) ?? []
      persistRows([row, ...current.filter((item) => item.apiId !== row.apiId)])
      invalidateExpenses(queryClient, tenantId)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ExpenseWrite> }) =>
      apiUpdateExpense(id, data),
    onSuccess: (saved) => {
      const current =
        queryClient.getQueryData<ExpenseRow[]>(expenseKeys.list(tenantId)) ?? []
      const index = current.findIndex((item) => item.apiId === saved.id)
      const row = mapApiExpenseToRow(saved, index < 0 ? current.length : index)
      persistRows(
        current.map((item) =>
          item.apiId === saved.id ? { ...row, id: item.id || row.id } : item
        )
      )
      invalidateExpenses(queryClient, tenantId)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(ids.map((id) => apiDeleteExpense(id)))
      return {
        deleted: results.filter((result) => result.status === "fulfilled").length,
        failed: results.filter((result) => result.status === "rejected").length,
      }
    },
    onSuccess: ({ deleted }, ids) => {
      if (deleted === 0) return
      const current =
        queryClient.getQueryData<ExpenseRow[]>(expenseKeys.list(tenantId)) ?? []
      persistRows(current.filter((item) => !ids.includes(item.apiId)))
      invalidateExpenses(queryClient, tenantId)
    },
  })

  const bulkCreateMutation = useMutation({
    mutationFn: (items: ExpenseWrite[]) => apiBulkCreateExpenses(items),
    onSuccess: (res) => {
      if ((res.added ?? res.items?.length ?? 0) > 0) {
        invalidateExpenses(queryClient, tenantId)
      }
    },
  })

  return {
    expenses,
    isLoading: !authHydrated || query.isLoading,
    isError: query.isError,
    error: query.error,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    removeMany: deleteMutation.mutateAsync,
    bulkCreate: bulkCreateMutation.mutateAsync,
  }
}
