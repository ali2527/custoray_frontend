"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useAuth } from "@/context/auth-context"
import {
  apiBulkCreateBuyers,
  apiCreateBuyer,
  apiDeleteBuyer,
  apiListAllBuyers,
  apiUpdateBuyer,
} from "@/lib/api/business"
import { customerKeys, invalidateCustomers } from "@/lib/customers-query"
import {
  cacheCustomers,
  loadCachedCustomers,
  mapApiBuyerToRow,
  type CustomerRow,
  type CustomerStatus,
  type CustomerWrite,
} from "@/lib/customers"
import { markSetupMilestone } from "@/lib/setup-progress"

export function useCustomersQuery() {
  const { session, hydrated: authHydrated } = useAuth()
  const tenantId = session?.tenantId
  const queryClient = useQueryClient()
  const enabled = authHydrated && Boolean(tenantId)

  const query = useQuery({
    queryKey: customerKeys.list(tenantId),
    enabled,
    placeholderData: () => loadCachedCustomers(tenantId) ?? undefined,
    queryFn: async () => {
      const items = await apiListAllBuyers()
      const rows = items.map(mapApiBuyerToRow)
      cacheCustomers(rows, tenantId)
      return rows
    },
  })

  const customers = query.data ?? []

  const persistRows = (rows: CustomerRow[]) => {
    queryClient.setQueryData(customerKeys.list(tenantId), rows)
    cacheCustomers(rows, tenantId)
  }

  const createMutation = useMutation({
    mutationFn: (data: CustomerWrite) => apiCreateBuyer(data),
    onSuccess: (saved) => {
      const row = mapApiBuyerToRow(saved, 0)
      const current =
        queryClient.getQueryData<CustomerRow[]>(customerKeys.list(tenantId)) ?? []
      persistRows([row, ...current.filter((item) => item.apiId !== row.apiId)])
      markSetupMilestone("customer")
      invalidateCustomers(queryClient, tenantId)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CustomerWrite> }) =>
      apiUpdateBuyer(id, data),
    onSuccess: (saved) => {
      const current =
        queryClient.getQueryData<CustomerRow[]>(customerKeys.list(tenantId)) ?? []
      const index = current.findIndex((item) => item.apiId === saved.id)
      const row = mapApiBuyerToRow(saved, index < 0 ? current.length : index)
      persistRows(
        current.map((item) =>
          item.apiId === saved.id ? { ...row, id: item.id || row.id } : item
        )
      )
      invalidateCustomers(queryClient, tenantId)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(ids.map((id) => apiDeleteBuyer(id)))
      return {
        deleted: results.filter((result) => result.status === "fulfilled").length,
        failed: results.filter((result) => result.status === "rejected").length,
      }
    },
    onSuccess: ({ deleted }, ids) => {
      if (deleted === 0) return
      const current =
        queryClient.getQueryData<CustomerRow[]>(customerKeys.list(tenantId)) ?? []
      persistRows(current.filter((item) => !ids.includes(item.apiId)))
      invalidateCustomers(queryClient, tenantId)
    },
  })

  const statusMutation = useMutation({
    mutationFn: async ({
      ids,
      status,
    }: {
      ids: string[]
      status: CustomerStatus
    }) => {
      const results = await Promise.allSettled(
        ids.map((id) => apiUpdateBuyer(id, { status }))
      )
      return {
        updated: results.filter((result) => result.status === "fulfilled").length,
        failed: results.filter((result) => result.status === "rejected").length,
      }
    },
    onSuccess: ({ updated }) => {
      if (updated > 0) invalidateCustomers(queryClient, tenantId)
    },
  })

  const bulkCreateMutation = useMutation({
    mutationFn: (items: CustomerWrite[]) => apiBulkCreateBuyers(items),
    onSuccess: (res) => {
      if ((res.added ?? res.items?.length ?? 0) > 0) {
        markSetupMilestone("customer")
        invalidateCustomers(queryClient, tenantId)
      }
    },
  })

  return {
    customers,
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
