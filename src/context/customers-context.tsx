"use client"

import * as React from "react"

import { useCustomersQuery } from "@/hooks/use-customers"
import { createLoadGate } from "@/lib/load-when-used"

const { LoadGate, useMarkNeeded } = createLoadGate()
import {
  customerDisplayId,
  mapApiBuyerToRow,
  toApiCustomerWrite,
  type CustomerRow,
} from "@/lib/customers"
import { loadDocumentNumberSettings, nextDocumentNumber } from "@/lib/document-number-settings"
import { isInactiveRow } from "@/lib/row-status"

type CustomersContextValue = {
  customers: CustomerRow[]
  loading: boolean
  getCustomer: (id: number) => CustomerRow | undefined
  addCustomer: (customer: Omit<CustomerRow, "id" | "apiId">) => Promise<CustomerRow>
  updateCustomer: (id: number, patch: Partial<CustomerRow>) => Promise<void>
  removeCustomer: (id: number) => Promise<void>
  duplicateCustomer: (id: number) => Promise<CustomerRow | null>
  removeMany: (ids: string[]) => Promise<{ deleted: number; failed: number; message?: string }>
  setStatus: (ids: string[], status: CustomerRow["status"]) => Promise<{
    updated: number
    failed: number
    message?: string
  }>
  bulkCreate: ReturnType<typeof useCustomersQuery>["bulkCreate"]
}

const CustomersContext = React.createContext<CustomersContextValue | null>(null)

export function CustomersProvider({ children }: { children: React.ReactNode }) {
  return (
    <LoadGate>
      {(active) => (
        <CustomersProviderLive active={active}>{children}</CustomersProviderLive>
      )}
    </LoadGate>
  )
}

function CustomersProviderLive({
  active,
  children,
}: {
  active: boolean
  children: React.ReactNode
}) {
  const {
    customers,
    isLoading,
    create,
    update,
    removeMany,
    setStatus,
    bulkCreate,
  } = useCustomersQuery(active)
  const customersRef = React.useRef(customers)
  customersRef.current = customers

  const getCustomer = React.useCallback(
    (id: number) => customers.find((c) => c.id === id),
    [customers]
  )

  const addCustomer = React.useCallback(
    async (customer: Omit<CustomerRow, "id" | "apiId">) => {
      const settings = loadDocumentNumberSettings().customers
      let code = customer.code?.trim() ?? ""
      if (!code && settings.mode === "auto") {
        code = nextDocumentNumber(
          customersRef.current.map((row) => row.code),
          settings.prefix,
          "CUS"
        )
      }
      const saved = await create(
        toApiCustomerWrite({ ...customer, code, id: 0, apiId: "" })
      )
      return mapApiBuyerToRow(saved, 0)
    },
    [create]
  )

  const updateCustomer = React.useCallback(
    async (id: number, patch: Partial<CustomerRow>) => {
      const current = customersRef.current.find((c) => c.id === id)
      if (!current?.apiId) return
      const next = { ...current, ...patch, id: current.id, apiId: current.apiId }
      const payload: Partial<ReturnType<typeof toApiCustomerWrite>> = {}
      if (patch.name !== undefined) payload.name = next.name
      if (patch.phone !== undefined) payload.phone = next.phone
      if (patch.description !== undefined) payload.description = next.description
      if (patch.status !== undefined) payload.status = next.status
      if (patch.openingBalance !== undefined) {
        payload.openingBalance = Number(next.openingBalance) || 0
      }
      if (patch.imageUrl !== undefined) payload.imageUrl = next.imageUrl
      if (patch.code !== undefined) payload.code = next.code.trim()
      if (Object.keys(payload).length === 0) return
      await update({ id: current.apiId, data: payload })
    },
    [update]
  )

  const removeCustomer = React.useCallback(
    async (id: number) => {
      const current = customersRef.current.find((c) => c.id === id)
      if (!current?.apiId) return
      await removeMany([current.apiId])
    },
    [removeMany]
  )

  const duplicateCustomer = React.useCallback(
    async (id: number) => {
      const source = customersRef.current.find((c) => c.id === id)
      if (!source || isInactiveRow(source)) return null
      const settings = loadDocumentNumberSettings().customers
      const base = customerDisplayId(source)
      let code = ""
      if (settings.mode === "custom") {
        const used = new Set(
          customersRef.current.map((row) => row.code.trim().toLowerCase()).filter(Boolean)
        )
        code = `${base}-copy`
        let n = 2
        while (used.has(code.toLowerCase())) {
          code = `${base}-copy-${n}`
          n += 1
        }
      }
      return addCustomer({
        name: `${source.name} (copy)`,
        description: source.description,
        openingBalance: "0.00",
        totalSales: "0.00",
        totalPayments: "0.00",
        phone: source.phone,
        status: "active",
        imageUrl: "",
        code,
      })
    },
    [addCustomer]
  )

  const value = React.useMemo(
    () => ({
      customers,
      loading: isLoading,
      getCustomer,
      addCustomer,
      updateCustomer,
      removeCustomer,
      duplicateCustomer,
      removeMany,
      setStatus: (ids: string[], status: CustomerRow["status"]) =>
        setStatus({ ids, status }),
      bulkCreate,
    }),
    [
      customers,
      isLoading,
      getCustomer,
      addCustomer,
      updateCustomer,
      removeCustomer,
      duplicateCustomer,
      removeMany,
      setStatus,
      bulkCreate,
    ]
  )

  return (
    <CustomersContext.Provider value={value}>{children}</CustomersContext.Provider>
  )
}

export function useCustomers() {
  useMarkNeeded()
  const ctx = React.useContext(CustomersContext)
  if (!ctx) {
    throw new Error("useCustomers must be used within CustomersProvider")
  }
  return ctx
}
