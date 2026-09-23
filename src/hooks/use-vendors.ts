"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useAuth } from "@/context/auth-context"
import {
  apiBulkCreateVendors,
  apiCreateVendor,
  apiDeleteVendor,
  apiListAllVendors,
  apiUpdateVendor,
} from "@/lib/api/business"
import { invalidateVendors, vendorKeys } from "@/lib/vendors-query"
import {
  cacheVendors,
  loadCachedVendors,
  mapApiVendorToRow,
  type VendorRow,
  type VendorStatus,
  type VendorWrite,
} from "@/lib/vendors"

export function useVendorsQuery() {
  const { session, hydrated: authHydrated } = useAuth()
  const tenantId = session?.tenantId
  const queryClient = useQueryClient()
  const enabled = authHydrated && Boolean(tenantId)

  const query = useQuery({
    queryKey: vendorKeys.list(tenantId),
    enabled,
    placeholderData: () => loadCachedVendors(tenantId) ?? undefined,
    queryFn: async () => {
      const items = await apiListAllVendors()
      const rows = items.map(mapApiVendorToRow)
      cacheVendors(rows, tenantId)
      return rows
    },
  })

  const vendors = query.data ?? []

  const persistRows = (rows: VendorRow[]) => {
    queryClient.setQueryData(vendorKeys.list(tenantId), rows)
    cacheVendors(rows, tenantId)
  }

  const createMutation = useMutation({
    mutationFn: (data: VendorWrite) => apiCreateVendor(data),
    onSuccess: (saved) => {
      const row = mapApiVendorToRow(saved, 0)
      const current =
        queryClient.getQueryData<VendorRow[]>(vendorKeys.list(tenantId)) ?? []
      persistRows([row, ...current.filter((item) => item.apiId !== row.apiId)].map(
        (item, index) => ({ ...item, id: index + 1 })
      ))
      invalidateVendors(queryClient, tenantId)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<VendorWrite> }) =>
      apiUpdateVendor(id, data),
    onSuccess: (saved) => {
      const current =
        queryClient.getQueryData<VendorRow[]>(vendorKeys.list(tenantId)) ?? []
      const index = current.findIndex((item) => item.apiId === saved.id)
      const row = mapApiVendorToRow(saved, index < 0 ? current.length : index)
      persistRows(
        current.map((item, itemIndex) =>
          item.apiId === saved.id
            ? { ...row, id: item.id || itemIndex + 1 }
            : item
        )
      )
      invalidateVendors(queryClient, tenantId)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(ids.map((id) => apiDeleteVendor(id)))
      return {
        deleted: results.filter((result) => result.status === "fulfilled").length,
        failed: results.filter((result) => result.status === "rejected").length,
      }
    },
    onSuccess: ({ deleted }, ids) => {
      if (deleted === 0) return
      const current =
        queryClient.getQueryData<VendorRow[]>(vendorKeys.list(tenantId)) ?? []
      persistRows(
        current
          .filter((item) => !ids.includes(item.apiId))
          .map((item, index) => ({ ...item, id: index + 1 }))
      )
      invalidateVendors(queryClient, tenantId)
    },
  })

  const statusMutation = useMutation({
    mutationFn: async ({
      ids,
      status,
    }: {
      ids: string[]
      status: VendorStatus
    }) => {
      const results = await Promise.allSettled(
        ids.map((id) => apiUpdateVendor(id, { status }))
      )
      return {
        updated: results.filter((result) => result.status === "fulfilled").length,
        failed: results.filter((result) => result.status === "rejected").length,
      }
    },
    onSuccess: ({ updated }) => {
      if (updated > 0) invalidateVendors(queryClient, tenantId)
    },
  })

  const bulkCreateMutation = useMutation({
    mutationFn: (items: VendorWrite[]) => apiBulkCreateVendors(items),
    onSuccess: (res) => {
      if ((res.added ?? res.items?.length ?? 0) > 0) {
        invalidateVendors(queryClient, tenantId)
      }
    },
  })

  return {
    vendors,
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
