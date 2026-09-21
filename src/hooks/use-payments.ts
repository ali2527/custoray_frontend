"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useAuth } from "@/context/auth-context"
import {
  apiBulkCreatePayments,
  apiCreatePayment,
  apiDeletePayment,
  apiListAllPayments,
  apiUpdatePayment,
} from "@/lib/api/business"
import { invalidatePayments, paymentKeys } from "@/lib/payments-query"
import {
  cachePayments,
  loadCachedPayments,
  mapApiPaymentToRow,
  type PaymentRow,
  type PaymentWrite,
} from "@/lib/payments"

function reindex(rows: PaymentRow[]): PaymentRow[] {
  return rows.map((item, index) => ({ ...item, id: index + 1 }))
}

export function usePaymentsQuery() {
  const { session, hydrated: authHydrated } = useAuth()
  const tenantId = session?.tenantId
  const queryClient = useQueryClient()
  const enabled = authHydrated && Boolean(tenantId)

  const query = useQuery({
    queryKey: paymentKeys.list(tenantId),
    enabled,
    placeholderData: () => loadCachedPayments(tenantId) ?? undefined,
    queryFn: async () => {
      const items = await apiListAllPayments()
      const rows = reindex(items.map((item, index) => mapApiPaymentToRow(item, index)))
      cachePayments(rows, tenantId)
      return rows
    },
  })

  const payments = query.data ?? []

  const persistRows = (rows: PaymentRow[]) => {
    const next = reindex(rows)
    queryClient.setQueryData(paymentKeys.list(tenantId), next)
    cachePayments(next, tenantId)
  }

  const createMutation = useMutation({
    mutationFn: (data: PaymentWrite) => apiCreatePayment(data),
    onSuccess: (saved) => {
      const row = mapApiPaymentToRow(saved, 0)
      const current =
        queryClient.getQueryData<PaymentRow[]>(paymentKeys.list(tenantId)) ?? []
      persistRows([row, ...current.filter((item) => item.apiId !== row.apiId)])
      invalidatePayments(queryClient, tenantId)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PaymentWrite> }) =>
      apiUpdatePayment(id, data),
    onSuccess: (saved) => {
      const current =
        queryClient.getQueryData<PaymentRow[]>(paymentKeys.list(tenantId)) ?? []
      const index = current.findIndex((item) => item.apiId === saved.id)
      const row = mapApiPaymentToRow(saved, index < 0 ? current.length : index)
      persistRows(
        current.map((item) =>
          item.apiId === saved.id ? { ...row, id: item.id || row.id } : item
        )
      )
      invalidatePayments(queryClient, tenantId)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(ids.map((id) => apiDeletePayment(id)))
      return {
        deleted: results.filter((result) => result.status === "fulfilled").length,
        failed: results.filter((result) => result.status === "rejected").length,
      }
    },
    onSuccess: ({ deleted }, ids) => {
      if (deleted === 0) return
      const current =
        queryClient.getQueryData<PaymentRow[]>(paymentKeys.list(tenantId)) ?? []
      persistRows(current.filter((item) => !ids.includes(item.apiId)))
      invalidatePayments(queryClient, tenantId)
    },
  })

  const bulkCreateMutation = useMutation({
    mutationFn: (items: PaymentWrite[]) => apiBulkCreatePayments(items),
    onSuccess: (res) => {
      if ((res.added ?? res.items?.length ?? 0) > 0) {
        invalidatePayments(queryClient, tenantId)
      }
    },
  })

  return {
    payments,
    isLoading: !authHydrated || query.isLoading,
    isError: query.isError,
    error: query.error,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    removeMany: deleteMutation.mutateAsync,
    bulkCreate: bulkCreateMutation.mutateAsync,
  }
}
