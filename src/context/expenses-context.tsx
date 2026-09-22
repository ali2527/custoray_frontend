"use client"

import * as React from "react"

import { useExpensesQuery } from "@/hooks/use-expenses"
import {
  mapApiExpenseToRow,
  toApiExpenseWrite,
  type ExpenseRow,
} from "@/lib/expenses"

type ExpensesContextValue = {
  expenses: ExpenseRow[]
  loading: boolean
  getExpense: (id: number) => ExpenseRow | undefined
  addExpense: (expense: Omit<ExpenseRow, "id" | "apiId">) => Promise<ExpenseRow>
  updateExpense: (id: number, patch: Partial<ExpenseRow>) => Promise<void>
  removeExpense: (id: number) => Promise<void>
  duplicateExpense: (id: number) => Promise<ExpenseRow | null>
  removeMany: (ids: string[]) => Promise<{ deleted: number; failed: number }>
  bulkCreate: ReturnType<typeof useExpensesQuery>["bulkCreate"]
}

const ExpensesContext = React.createContext<ExpensesContextValue | null>(null)

export function ExpensesProvider({ children }: { children: React.ReactNode }) {
  const { expenses, isLoading, create, update, removeMany, bulkCreate } =
    useExpensesQuery()
  const expensesRef = React.useRef(expenses)
  expensesRef.current = expenses

  const getExpense = React.useCallback(
    (id: number) => expenses.find((row) => row.id === id),
    [expenses]
  )

  const addExpense = React.useCallback(
    async (expense: Omit<ExpenseRow, "id" | "apiId">) => {
      const saved = await create(
        toApiExpenseWrite({ ...expense, id: 0, apiId: "" })
      )
      return mapApiExpenseToRow(saved, 0)
    },
    [create]
  )

  const updateExpense = React.useCallback(
    async (id: number, patch: Partial<ExpenseRow>) => {
      const current = expensesRef.current.find((row) => row.id === id)
      if (!current?.apiId) return
      const next = { ...current, ...patch, id: current.id, apiId: current.apiId }
      await update({ id: current.apiId, data: toApiExpenseWrite(next) })
    },
    [update]
  )

  const removeExpense = React.useCallback(
    async (id: number) => {
      const current = expensesRef.current.find((row) => row.id === id)
      if (!current?.apiId) return
      await removeMany([current.apiId])
    },
    [removeMany]
  )

  const duplicateExpense = React.useCallback(
    async (id: number) => {
      const source = expensesRef.current.find((row) => row.id === id)
      if (!source) return null
      return addExpense({
        typeId: source.typeId,
        expenseNumber: "",
        typeName: source.typeName,
        payeeName: "",
        expenseDate: source.expenseDate,
        amount: source.amount,
        paymentMethod: source.paymentMethod,
        status: "pending",
        notes: source.notes,
      })
    },
    [addExpense]
  )

  const value = React.useMemo(
    () => ({
      expenses,
      loading: isLoading,
      getExpense,
      addExpense,
      updateExpense,
      removeExpense,
      duplicateExpense,
      removeMany,
      bulkCreate,
    }),
    [
      expenses,
      isLoading,
      getExpense,
      addExpense,
      updateExpense,
      removeExpense,
      duplicateExpense,
      removeMany,
      bulkCreate,
    ]
  )

  return (
    <ExpensesContext.Provider value={value}>{children}</ExpensesContext.Provider>
  )
}

export function useExpenses() {
  const ctx = React.useContext(ExpensesContext)
  if (!ctx) {
    throw new Error("useExpenses must be used within ExpensesProvider")
  }
  return ctx
}
