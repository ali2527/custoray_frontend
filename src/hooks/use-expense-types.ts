"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useAuth } from "@/context/auth-context"
import {
  apiBulkCreateExpenseTypes,
  apiCreateExpenseType,
  apiDeleteExpenseType,
  apiListAllExpenseTypes,
  apiUpdateExpenseType,
} from "@/lib/api/business"
import { expenseTypeKeys, invalidateExpenseTypes } from "@/lib/expense-types-query"
import {
  cacheExpenseTypes,
  loadCachedExpenseTypes,
  mapApiExpenseTypeToRow,
  type ExpenseTypeRow,
  type ExpenseTypeStatus,
  type ExpenseTypeWrite,
} from "@/lib/expense-types"

function reindex(rows: ExpenseTypeRow[]): ExpenseTypeRow[] {
  return rows.map((item, index) => ({ ...item, id: index + 1 }))
}

export function useExpenseTypesQuery() {
  const { session, hydrated: authHydrated } = useAuth()
  const tenantId = session?.tenantId
  const queryClient = useQueryClient()
  const enabled = authHydrated && Boolean(tenantId)

  const query = useQuery({
    queryKey: expenseTypeKeys.list(tenantId),
    enabled,
    placeholderData: () => loadCachedExpenseTypes(tenantId) ?? undefined,
    queryFn: async () => {
      const items = await apiListAllExpenseTypes()
      const rows = reindex(items.map((item, index) => mapApiExpenseTypeToRow(item, index)))
      cacheExpenseTypes(rows, tenantId)
      return rows
    },
  })

  const expenseTypes = query.data ?? []

  const persistRows = (rows: ExpenseTypeRow[]) => {
    const next = reindex(rows)
    queryClient.setQueryData(expenseTypeKeys.list(tenantId), next)
    cacheExpenseTypes(next, tenantId)
  }

  const createMutation = useMutation({
    mutationFn: (data: ExpenseTypeWrite) => apiCreateExpenseType(data),
    onSuccess: (saved) => {
      const row = mapApiExpenseTypeToRow(saved, 0)
      const current =
        queryClient.getQueryData<ExpenseTypeRow[]>(expenseTypeKeys.list(tenantId)) ?? []
      persistRows([row, ...current.filter((item) => item.apiId !== row.apiId)])
      invalidateExpenseTypes(queryClient, tenantId)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ExpenseTypeWrite> }) =>
      apiUpdateExpenseType(id, data),
    onSuccess: (saved) => {
      const current =
        queryClient.getQueryData<ExpenseTypeRow[]>(expenseTypeKeys.list(tenantId)) ?? []
      const index = current.findIndex((item) => item.apiId === saved.id)
      const row = mapApiExpenseTypeToRow(saved, index < 0 ? current.length : index)
      persistRows(
        current.map((item) =>
          item.apiId === saved.id ? { ...row, id: item.id || row.id } : item
        )
      )
      invalidateExpenseTypes(queryClient, tenantId)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(ids.map((id) => apiDeleteExpenseType(id)))
      return {
        deleted: results.filter((result) => result.status === "fulfilled").length,
        failed: results.filter((result) => result.status === "rejected").length,
      }
    },
    onSuccess: ({ deleted }, ids) => {
      if (deleted === 0) return
      const current =
        queryClient.getQueryData<ExpenseTypeRow[]>(expenseTypeKeys.list(tenantId)) ?? []
      persistRows(current.filter((item) => !ids.includes(item.apiId)))
      invalidateExpenseTypes(queryClient, tenantId)
    },
  })

  const statusMutation = useMutation({
    mutationFn: async ({
      ids,
      status,
    }: {
      ids: string[]
      status: ExpenseTypeStatus
    }) => {
      const results = await Promise.allSettled(
        ids.map((id) => apiUpdateExpenseType(id, { status }))
      )
      return {
        updated: results.filter((result) => result.status === "fulfilled").length,
        failed: results.filter((result) => result.status === "rejected").length,
      }
    },
    onSuccess: ({ updated }) => {
      if (updated > 0) invalidateExpenseTypes(queryClient, tenantId)
    },
  })

  const bulkCreateMutation = useMutation({
    mutationFn: (items: ExpenseTypeWrite[]) => apiBulkCreateExpenseTypes(items),
    onSuccess: (res) => {
      if ((res.added ?? res.items?.length ?? 0) > 0) {
        invalidateExpenseTypes(queryClient, tenantId)
      }
    },
  })

  return {
    expenseTypes,
    isLoading: !authHydrated || query.isLoading,
    isError: query.isError,
    error: query.error,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    removeMany: deleteMutation.mutateAsync,
    setStatus: statusMutation.mutateAsync,
    bulkCreate: bulkCreateMutation.mutateAsync,
  }
}
