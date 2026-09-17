"use client"

import * as React from "react"

import { useCustomersQuery } from "@/hooks/use-customers"
import {
  mapApiBuyerToRow,
  toApiCustomerWrite,
  type CustomerRow,
} from "@/lib/customers"

type CustomersContextValue = {
  customers: CustomerRow[]
  loading: boolean
  getCustomer: (id: number) => CustomerRow | undefined
  addCustomer: (customer: Omit<CustomerRow, "id" | "apiId">) => Promise<CustomerRow>
  updateCustomer: (id: number, patch: Partial<CustomerRow>) => Promise<void>
  removeCustomer: (id: number) => Promise<void>
  duplicateCustomer: (id: number) => Promise<CustomerRow | null>
  removeMany: (ids: string[]) => Promise<{ deleted: number; failed: number }>
  setStatus: (ids: string[], status: CustomerRow["status"]) => Promise<{
    updated: number
    failed: number
  }>
  bulkCreate: ReturnType<typeof useCustomersQuery>["bulkCreate"]
}

const CustomersContext = React.createContext<CustomersContextValue | null>(null)

export function CustomersProvider({ children }: { children: React.ReactNode }) {
  const {
    customers,
    isLoading,
    create,
    update,
    removeMany,
    setStatus,
    bulkCreate,
  } = useCustomersQuery()
  const customersRef = React.useRef(customers)
  customersRef.current = customers

  const getCustomer = React.useCallback(
    (id: number) => customers.find((c) => c.id === id),
    [customers]
  )

  const addCustomer = React.useCallback(
    async (customer: Omit<CustomerRow, "id" | "apiId">) => {
      const saved = await create(toApiCustomerWrite({ ...customer, id: 0, apiId: "" }))
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
      if (!source) return null
      return addCustomer({
        name: `${source.name} (copy)`,
        description: source.description,
        openingBalance: "0.00",
        totalSales: "0.00",
        totalPayments: "0.00",
        phone: source.phone,
        status: source.status,
        imageUrl: "",
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
  const ctx = React.useContext(CustomersContext)
  if (!ctx) {
    throw new Error("useCustomers must be used within CustomersProvider")
  }
  return ctx
}
