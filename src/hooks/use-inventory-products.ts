"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useAuth } from "@/context/auth-context"
import {
  apiBulkCreateProducts,
  apiCreateBrand,
  apiCreateCategory,
  apiCreateProduct,
  apiCreateVariant,
  apiDeleteProduct,
  apiListAllProducts,
  apiListProductFacets,
  apiUpdateProduct,
  type ApiProductWrite,
} from "@/lib/api/business"
import { inventoryKeys, invalidateInventory } from "@/lib/inventory-query"
import {
  PRODUCT_VARIANTS,
  cacheInventoryProducts,
  duplicateProductRow,
  loadCachedInventoryProducts,
  mapApiProductToRow,
  mapImportedProduct,
  toApiProductWrite,
  uniqueSorted,
  type ProductRow,
} from "@/lib/inventory-product-rows"
import { markSetupMilestone } from "@/lib/setup-progress"
import type { ProductSkuSettings } from "@/lib/product-sku-settings"
import type { CatalogTablesSettings } from "@/lib/catalog-field-settings"

export type ProductLookupType = "brand" | "category" | "variant"

const EMPTY_FACETS = {
  brands: [] as { id: string; name: string }[],
  categories: [] as { id: string; name: string }[],
  variants: [] as { id: string; name: string }[],
}

export function useInventoryProducts() {
  const { session, hydrated: authHydrated } = useAuth()
  const tenantId = session?.tenantId
  const queryClient = useQueryClient()
  const enabled = authHydrated && Boolean(tenantId)

  const productsQuery = useQuery({
    queryKey: inventoryKeys.products(tenantId),
    enabled,
    placeholderData: () => loadCachedInventoryProducts(tenantId) ?? undefined,
    queryFn: async () => {
      const items = await apiListAllProducts()
      const rows = items.map(mapApiProductToRow)
      cacheInventoryProducts(rows, tenantId)
      return rows
    },
  })

  const facetsQuery = useQuery({
    queryKey: inventoryKeys.facets(tenantId),
    enabled,
    queryFn: async () => {
      try {
        return await apiListProductFacets()
      } catch {
        return EMPTY_FACETS
      }
    },
  })

  const products = productsQuery.data ?? []
  const facets = facetsQuery.data ?? EMPTY_FACETS

  const brandOptions = uniqueSorted([
    ...facets.brands.map((item) => item.name),
    ...products.map((row) => row.brand),
  ])
  const categoryOptions = uniqueSorted([
    ...facets.categories.map((item) => item.name),
    ...products.map((row) => row.category),
  ])
  const variantOptions = uniqueSorted([
    ...PRODUCT_VARIANTS,
    ...facets.variants.map((item) => item.name),
    ...products.map((row) => row.variant),
  ])

  const persistRows = (rows: ProductRow[]) => {
    queryClient.setQueryData(inventoryKeys.products(tenantId), rows)
    cacheInventoryProducts(rows, tenantId)
  }

  const saveMutation = useMutation({
    mutationFn: async ({
      row,
      isNew,
    }: {
      row: ProductRow
      isNew: boolean
    }) => {
      const saved = isNew
        ? await apiCreateProduct(toApiProductWrite(row))
        : await apiUpdateProduct(row.id!, toApiProductWrite(row))
      return { row: mapApiProductToRow(saved), isNew }
    },
    onSuccess: ({ row, isNew }) => {
      const current =
        queryClient.getQueryData<ProductRow[]>(inventoryKeys.products(tenantId)) ??
        []
      persistRows(
        isNew
          ? [row, ...current]
          : current.map((item) => (item.id === row.id ? row : item))
      )
      if (isNew) markSetupMilestone("product")
      invalidateInventory(queryClient, tenantId)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(ids.map((id) => apiDeleteProduct(id)))
      return {
        deletedIds: ids.filter((_, index) => results[index]?.status === "fulfilled"),
        failed: results.filter((result) => result.status === "rejected").length,
      }
    },
    onSuccess: ({ deletedIds }) => {
      if (deletedIds.length === 0) return
      const deleted = new Set(deletedIds)
      const current =
        queryClient.getQueryData<ProductRow[]>(inventoryKeys.products(tenantId)) ??
        []
      persistRows(current.filter((row) => !row.id || !deleted.has(row.id)))
      invalidateInventory(queryClient, tenantId)
    },
  })

  const lifecycleMutation = useMutation({
    mutationFn: async ({
      ids,
      lifecycle,
    }: {
      ids: string[]
      lifecycle: ProductRow["lifecycle"]
    }) => {
      const results = await Promise.allSettled(
        ids.map((id) => apiUpdateProduct(id, { lifecycle }))
      )
      return {
        updatedIds: ids.filter((_, index) => results[index]?.status === "fulfilled"),
        failed: results.filter((result) => result.status === "rejected").length,
        lifecycle,
      }
    },
    onSuccess: ({ updatedIds, lifecycle }) => {
      if (updatedIds.length === 0) return
      const updated = new Set(updatedIds)
      const current =
        queryClient.getQueryData<ProductRow[]>(inventoryKeys.products(tenantId)) ??
        []
      persistRows(
        current.map((row) =>
          row.id && updated.has(row.id) ? { ...row, lifecycle } : row
        )
      )
      invalidateInventory(queryClient, tenantId)
    },
  })

  const duplicateMutation = useMutation({
    mutationFn: async ({
      source,
      skuSettings,
    }: {
      source: ProductRow
      skuSettings: ProductSkuSettings
    }) => {
      const current =
        queryClient.getQueryData<ProductRow[]>(inventoryKeys.products(tenantId)) ??
        []
      const draft = {
        ...duplicateProductRow(source, current, skuSettings),
        lifecycle: "active" as const,
      }
      const created = await apiCreateProduct(toApiProductWrite(draft))
      return mapApiProductToRow(created)
    },
    onSuccess: (row) => {
      const current =
        queryClient.getQueryData<ProductRow[]>(inventoryKeys.products(tenantId)) ??
        []
      persistRows([row, ...current])
      markSetupMilestone("product")
      invalidateInventory(queryClient, tenantId)
    },
  })

  const importMutation = useMutation({
    mutationFn: async ({
      rows,
      skuSettings,
      tables,
    }: {
      rows: Record<string, string>[]
      skuSettings: ProductSkuSettings
      tables?: CatalogTablesSettings
    }) => {
      const current =
        queryClient.getQueryData<ProductRow[]>(inventoryKeys.products(tenantId)) ??
        []
      const catalog = {
        brands: brandOptions,
        categories: categoryOptions,
        variants: variantOptions,
        tables,
      }
      let acc = [...current]
      const payload: ApiProductWrite[] = []
      const unmatched = new Set<string>()
      for (const row of rows) {
        const mapped = mapImportedProduct(row, acc, skuSettings, catalog, (name) =>
          unmatched.add(name)
        )
        if (!mapped) continue
        acc = [...acc, mapped]
        payload.push(toApiProductWrite(mapped))
      }
      if (payload.length === 0) {
        return { created: [] as ProductRow[], failed: 0, unmatched }
      }
      const extra = Math.max(0, payload.length - 100)
      const res = await apiBulkCreateProducts(payload.slice(0, 100))
      const created = (res.items ?? []).map(mapApiProductToRow)
      const failed = extra + (res.errors?.length ?? 0)
      if ((res.errors?.length ?? 0) > 0 && created.length === 0) {
        throw new Error(res.errors[0]?.message || "Import failed")
      }
      return { created, failed, unmatched }
    },
    onSuccess: ({ created }) => {
      if (created.length === 0) return
      const current =
        queryClient.getQueryData<ProductRow[]>(inventoryKeys.products(tenantId)) ??
        []
      persistRows([...created, ...current])
      markSetupMilestone("product")
      invalidateInventory(queryClient, tenantId)
    },
  })

  const lookupMutation = useMutation({
    mutationFn: async ({
      type,
      name,
      description,
      status,
    }: {
      type: ProductLookupType
      name: string
      description?: string
      status?: string
    }) => {
      const payload = { name: name.trim(), description, status }
      if (type === "category") return apiCreateCategory(payload)
      if (type === "variant") return apiCreateVariant(payload)
      return apiCreateBrand(payload)
    },
    onSuccess: (item, vars) => {
      queryClient.setQueryData(
        inventoryKeys.facets(tenantId),
        (old: typeof EMPTY_FACETS | undefined) => {
          const current = old ?? EMPTY_FACETS
          const key =
            vars.type === "category"
              ? "categories"
              : vars.type === "variant"
                ? "variants"
                : "brands"
          const list = current[key] ?? []
          if (list.some((entry) => entry.name === vars.name)) return current
          return {
            ...current,
            [key]: [...list, { id: item.id, name: item.name || vars.name }],
          }
        }
      )
      invalidateInventory(queryClient, tenantId)
    },
  })

  return {
    products,
    brandOptions,
    categoryOptions,
    variantOptions,
    isLoading: !authHydrated || productsQuery.isLoading,
    isError: productsQuery.isError,
    error: productsQuery.error,
    save: saveMutation.mutateAsync,
    removeMany: deleteMutation.mutateAsync,
    setLifecycle: lifecycleMutation.mutateAsync,
    duplicate: duplicateMutation.mutateAsync,
    importRows: importMutation.mutateAsync,
    createLookup: lookupMutation.mutateAsync,
  }
}
