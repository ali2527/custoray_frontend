"use client"

import * as React from "react"

import { useExpenseTypesQuery } from "@/hooks/use-expense-types"
import {
  mapApiExpenseTypeToRow,
  toApiExpenseTypeWrite,
  type ExpenseTypeRow,
} from "@/lib/expense-types"

type ExpenseTypesContextValue = {
  expenseTypes: ExpenseTypeRow[]
  loading: boolean
  getExpenseType: (id: number) => ExpenseTypeRow | undefined
  addExpenseType: (
    row: Omit<ExpenseTypeRow, "id" | "apiId" | "expensesCount">
  ) => Promise<ExpenseTypeRow>
  updateExpenseType: (id: number, patch: Partial<ExpenseTypeRow>) => Promise<void>
  removeExpenseType: (id: number) => Promise<void>
  removeMany: (ids: string[]) => Promise<{ deleted: number; failed: number }>
  setStatus: (
    ids: string[],
    status: ExpenseTypeRow["status"]
  ) => Promise<{ updated: number; failed: number }>
  bulkCreate: ReturnType<typeof useExpenseTypesQuery>["bulkCreate"]
}

const ExpenseTypesContext = React.createContext<ExpenseTypesContextValue | null>(null)

export function ExpenseTypesProvider({ children }: { children: React.ReactNode }) {
  const {
    expenseTypes,
    isLoading,
    create,
    update,
    removeMany,
    setStatus,
    bulkCreate,
  } = useExpenseTypesQuery()
  const rowsRef = React.useRef(expenseTypes)
  rowsRef.current = expenseTypes

  const getExpenseType = React.useCallback(
    (id: number) => expenseTypes.find((row) => row.id === id),
    [expenseTypes]
  )

  const addExpenseType = React.useCallback(
    async (row: Omit<ExpenseTypeRow, "id" | "apiId" | "expensesCount">) => {
      const saved = await create(
        toApiExpenseTypeWrite({ ...row, id: 0, apiId: "", expensesCount: 0 })
      )
      return mapApiExpenseTypeToRow(saved, 0)
    },
    [create]
  )

  const updateExpenseType = React.useCallback(
    async (id: number, patch: Partial<ExpenseTypeRow>) => {
      const current = rowsRef.current.find((row) => row.id === id)
      if (!current?.apiId) return
      const next = { ...current, ...patch, id: current.id, apiId: current.apiId }
      await update({ id: current.apiId, data: toApiExpenseTypeWrite(next) })
    },
    [update]
  )

  const removeExpenseType = React.useCallback(
    async (id: number) => {
      const current = rowsRef.current.find((row) => row.id === id)
      if (!current?.apiId) return
      await removeMany([current.apiId])
    },
    [removeMany]
  )

  const value = React.useMemo(
    () => ({
      expenseTypes,
      loading: isLoading,
      getExpenseType,
      addExpenseType,
      updateExpenseType,
      removeExpenseType,
      removeMany,
      setStatus: (ids: string[], status: ExpenseTypeRow["status"]) =>
        setStatus({ ids, status }),
      bulkCreate,
    }),
    [
      expenseTypes,
      isLoading,
      getExpenseType,
      addExpenseType,
      updateExpenseType,
      removeExpenseType,
      removeMany,
      setStatus,
      bulkCreate,
    ]
  )

  return (
    <ExpenseTypesContext.Provider value={value}>{children}</ExpenseTypesContext.Provider>
  )
}

export function useExpenseTypes() {
  const ctx = React.useContext(ExpenseTypesContext)
  if (!ctx) {
    throw new Error("useExpenseTypes must be used within ExpenseTypesProvider")
  }
  return ctx
}
