"use client"

import * as React from "react"

import { useVendorsQuery } from "@/hooks/use-vendors"
import {
  mapApiVendorToRow,
  toApiVendorWrite,
  type VendorRow,
} from "@/lib/vendors"

type VendorsContextValue = {
  vendors: VendorRow[]
  loading: boolean
  getVendor: (id: number) => VendorRow | undefined
  addVendor: (vendor: Omit<VendorRow, "id" | "apiId">) => Promise<VendorRow>
  updateVendor: (id: number, patch: Partial<VendorRow>) => Promise<void>
  removeVendor: (id: number) => Promise<void>
  duplicateVendor: (id: number) => Promise<VendorRow | null>
  removeMany: (ids: string[]) => Promise<{ deleted: number; failed: number }>
  setStatus: (ids: string[], status: VendorRow["status"]) => Promise<{
    updated: number
    failed: number
  }>
  bulkCreate: ReturnType<typeof useVendorsQuery>["bulkCreate"]
}

const VendorsContext = React.createContext<VendorsContextValue | null>(null)

export function VendorsProvider({ children }: { children: React.ReactNode }) {
  const {
    vendors,
    isLoading,
    create,
    update,
    removeMany,
    setStatus,
    bulkCreate,
  } = useVendorsQuery()
  const vendorsRef = React.useRef(vendors)
  vendorsRef.current = vendors

  const getVendor = React.useCallback(
    (id: number) => vendors.find((v) => v.id === id),
    [vendors]
  )

  const addVendor = React.useCallback(
    async (vendor: Omit<VendorRow, "id" | "apiId">) => {
      const saved = await create(toApiVendorWrite({ ...vendor, id: 0, apiId: "" }))
      return mapApiVendorToRow(saved, 0)
    },
    [create]
  )

  const updateVendor = React.useCallback(
    async (id: number, patch: Partial<VendorRow>) => {
      const current = vendorsRef.current.find((v) => v.id === id)
      if (!current?.apiId) return
      const next = { ...current, ...patch, id: current.id, apiId: current.apiId }
      const payload: Partial<ReturnType<typeof toApiVendorWrite>> = {}
      if (patch.name !== undefined) payload.name = next.name
      if (patch.phone !== undefined) payload.phone = next.phone
      if (patch.description !== undefined) payload.description = next.description
      if (patch.status !== undefined) payload.status = next.status
      if (patch.openingBalance !== undefined) {
        payload.openingBalance = Number(next.openingBalance) || 0
      }
      if (patch.imageUrl !== undefined) payload.imageUrl = next.imageUrl
      if (Object.keys(payload).length === 0) return
      await update({ id: current.apiId, data: payload })
    },
    [update]
  )

  const removeVendor = React.useCallback(
    async (id: number) => {
      const current = vendorsRef.current.find((v) => v.id === id)
      if (!current?.apiId) return
      await removeMany([current.apiId])
    },
    [removeMany]
  )

  const duplicateVendor = React.useCallback(
    async (id: number) => {
      const source = vendorsRef.current.find((v) => v.id === id)
      if (!source) return null
      return addVendor({
        name: `${source.name} (copy)`,
        description: source.description,
        openingBalance: "0.00",
        totalPurchases: "0.00",
        totalPayments: "0.00",
        phone: source.phone,
        status: source.status,
        imageUrl: "",
      })
    },
    [addVendor]
  )

  const value = React.useMemo(
    () => ({
      vendors,
      loading: isLoading,
      getVendor,
      addVendor,
      updateVendor,
      removeVendor,
      duplicateVendor,
      removeMany,
      setStatus: (ids: string[], status: VendorRow["status"]) =>
        setStatus({ ids, status }),
      bulkCreate,
    }),
    [
      vendors,
      isLoading,
      getVendor,
      addVendor,
      updateVendor,
      removeVendor,
      duplicateVendor,
      removeMany,
      setStatus,
      bulkCreate,
    ]
  )

  return <VendorsContext.Provider value={value}>{children}</VendorsContext.Provider>
}

export function useVendors() {
  const ctx = React.useContext(VendorsContext)
  if (!ctx) {
    throw new Error("useVendors must be used within VendorsProvider")
  }
  return ctx
}
