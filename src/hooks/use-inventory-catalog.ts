"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useAuth } from "@/context/auth-context"
import {
  apiBulkCreateBrands,
  apiBulkCreateCategories,
  apiBulkCreateVariants,
  apiCreateBrand,
  apiCreateCategory,
  apiCreateVariant,
  apiDeleteBrand,
  apiDeleteCategory,
  apiDeleteVariant,
  apiListBrands,
  apiListCategories,
  apiListVariants,
  apiUpdateBrand,
  apiUpdateCategory,
  apiUpdateVariant,
} from "@/lib/api/business"
import {
  mapApiCatalogToRow,
  type CatalogStatus,
} from "@/lib/inventory-catalog-rows"
import {
  type CatalogKind,
  inventoryKeys,
  invalidateInventory,
} from "@/lib/inventory-query"

type CatalogWrite = { name: string; description?: string; status?: string }
type CatalogPatch = { name?: string; description?: string; status?: string }

const catalogApi = {
  brands: {
    list: apiListBrands,
    create: apiCreateBrand,
    update: apiUpdateBrand,
    remove: apiDeleteBrand,
    bulk: apiBulkCreateBrands,
  },
  categories: {
    list: apiListCategories,
    create: apiCreateCategory,
    update: apiUpdateCategory,
    remove: apiDeleteCategory,
    bulk: apiBulkCreateCategories,
  },
  variants: {
    list: apiListVariants,
    create: apiCreateVariant,
    update: apiUpdateVariant,
    remove: apiDeleteVariant,
    bulk: apiBulkCreateVariants,
  },
} as const

export function useInventoryCatalog(kind: CatalogKind) {
  const { session, hydrated: authHydrated } = useAuth()
  const tenantId = session?.tenantId
  const queryClient = useQueryClient()
  const enabled = authHydrated && Boolean(tenantId)
  const api = catalogApi[kind]

  const query = useQuery({
    queryKey: inventoryKeys.catalog(kind, tenantId),
    enabled,
    queryFn: async () => {
      const items = await api.list()
      return items.map(mapApiCatalogToRow)
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: CatalogWrite) => api.create(data),
    onSuccess: () => invalidateInventory(queryClient, tenantId),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CatalogPatch }) =>
      api.update(id, data),
    onSuccess: () => invalidateInventory(queryClient, tenantId),
  })

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(ids.map((id) => api.remove(id)))
      return {
        deleted: results.filter((result) => result.status === "fulfilled").length,
        failed: results.filter((result) => result.status === "rejected").length,
      }
    },
    onSuccess: ({ deleted }) => {
      if (deleted > 0) invalidateInventory(queryClient, tenantId)
    },
  })

  const statusMutation = useMutation({
    mutationFn: async ({
      ids,
      status,
    }: {
      ids: string[]
      status: CatalogStatus
    }) => {
      const results = await Promise.allSettled(
        ids.map((id) => api.update(id, { status }))
      )
      return {
        updated: results.filter((result) => result.status === "fulfilled").length,
        failed: results.filter((result) => result.status === "rejected").length,
      }
    },
    onSuccess: ({ updated }) => {
      if (updated > 0) invalidateInventory(queryClient, tenantId)
    },
  })

  const bulkCreateMutation = useMutation({
    mutationFn: (items: CatalogWrite[]) => api.bulk(items),
    onSuccess: (res) => {
      if ((res.added ?? res.items?.length ?? 0) > 0) {
        invalidateInventory(queryClient, tenantId)
      }
    },
  })

  return {
    rows: query.data ?? [],
    isLoading: !authHydrated || query.isLoading,
    isError: query.isError,
    error: query.error,
    errorUpdatedAt: query.errorUpdatedAt,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    removeMany: deleteMutation.mutateAsync,
    setStatus: statusMutation.mutateAsync,
    bulkCreate: bulkCreateMutation.mutateAsync,
  }
}

export function useInventoryBrands() {
  return useInventoryCatalog("brands")
}

export function useInventoryCategories() {
  return useInventoryCatalog("categories")
}

export function useInventoryVariants() {
  return useInventoryCatalog("variants")
}
