"use client"

import * as React from "react"
import {
  type SaleRow,
  nextSaleNumber,
} from "@/lib/sales"

type SalesContextValue = {
  sales: SaleRow[]
  setSales: React.Dispatch<React.SetStateAction<SaleRow[]>>
  getSale: (id: number) => SaleRow | undefined
  addSale: (sale: Omit<SaleRow, "id">) => SaleRow
  updateSale: (id: number, patch: Partial<SaleRow>) => void
  removeSale: (id: number) => void
  duplicateSale: (id: number) => SaleRow | null
}

const SalesContext = React.createContext<SalesContextValue | null>(null)

export function SalesProvider({ children }: { children: React.ReactNode }) {
  const [sales, setSales] = React.useState<SaleRow[]>([])

  const getSale = React.useCallback(
    (id: number) => sales.find((s) => s.id === id),
    [sales]
  )

  const addSale = React.useCallback((sale: Omit<SaleRow, "id">) => {
    let created = { ...sale, id: 0 } as SaleRow
    setSales((prev) => {
      const maxId = prev.reduce((m, x) => Math.max(m, x.id), 0)
      created = {
        ...sale,
        id: maxId + 1,
        saleNumber: sale.saleNumber.trim() || nextSaleNumber(prev),
      }
      return [...prev, created]
    })
    return created
  }, [])

  const updateSale = React.useCallback((id: number, patch: Partial<SaleRow>) => {
    setSales((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch, id: s.id } : s))
    )
  }, [])

  const removeSale = React.useCallback((id: number) => {
    setSales((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const duplicateSale = React.useCallback((id: number) => {
    let copy: SaleRow | null = null
    setSales((prev) => {
      const source = prev.find((s) => s.id === id)
      if (!source) return prev
      const maxId = prev.reduce((m, x) => Math.max(m, x.id), 0)
      copy = {
        ...source,
        id: maxId + 1,
        saleNumber: nextSaleNumber(prev),
        paidAmount: "0",
        status: "pending",
      }
      return [...prev, copy]
    })
    return copy
  }, [])

  const value = React.useMemo(
    () => ({
      sales,
      setSales,
      getSale,
      addSale,
      updateSale,
      removeSale,
      duplicateSale,
    }),
    [sales, getSale, addSale, updateSale, removeSale, duplicateSale]
  )

  return <SalesContext.Provider value={value}>{children}</SalesContext.Provider>
}

export function useSales() {
  const ctx = React.useContext(SalesContext)
  if (!ctx) {
    throw new Error("useSales must be used within SalesProvider")
  }
  return ctx
}
