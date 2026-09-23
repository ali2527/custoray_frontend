"use client"

import * as React from "react"

import { usePaymentsQuery } from "@/hooks/use-payments"
import {
  mapApiPaymentToRow,
  toApiPaymentWrite,
  type PaymentRow,
} from "@/lib/payments"

type PaymentsContextValue = {
  payments: PaymentRow[]
  loading: boolean
  getPayment: (id: number) => PaymentRow | undefined
  addPayment: (payment: Omit<PaymentRow, "id" | "apiId">) => Promise<PaymentRow>
  updatePayment: (id: number, patch: Partial<PaymentRow>) => Promise<void>
  removePayment: (id: number) => Promise<void>
  duplicatePayment: (id: number) => Promise<PaymentRow | null>
  removeMany: (ids: string[]) => Promise<{ deleted: number; failed: number }>
  bulkCreate: ReturnType<typeof usePaymentsQuery>["bulkCreate"]
}

const PaymentsContext = React.createContext<PaymentsContextValue | null>(null)

export function PaymentsProvider({ children }: { children: React.ReactNode }) {
  const {
    payments,
    isLoading,
    create,
    update,
    removeMany,
    bulkCreate,
  } = usePaymentsQuery()
  const paymentsRef = React.useRef(payments)
  paymentsRef.current = payments

  const getPayment = React.useCallback(
    (id: number) => payments.find((row) => row.id === id),
    [payments]
  )

  const addPayment = React.useCallback(
    async (payment: Omit<PaymentRow, "id" | "apiId">) => {
      const saved = await create(
        toApiPaymentWrite({ ...payment, id: 0, apiId: "" })
      )
      return mapApiPaymentToRow(saved, 0)
    },
    [create]
  )

  const updatePayment = React.useCallback(
    async (id: number, patch: Partial<PaymentRow>) => {
      const current = paymentsRef.current.find((row) => row.id === id)
      if (!current?.apiId) return
      const next = { ...current, ...patch, id: current.id, apiId: current.apiId }
      await update({ id: current.apiId, data: toApiPaymentWrite(next) })
    },
    [update]
  )

  const removePayment = React.useCallback(
    async (id: number) => {
      const current = paymentsRef.current.find((row) => row.id === id)
      if (!current?.apiId) return
      await removeMany([current.apiId])
    },
    [removeMany]
  )

  const duplicatePayment = React.useCallback(
    async (id: number) => {
      const source = paymentsRef.current.find((row) => row.id === id)
      if (!source) return null
      return addPayment({
        partyId: source.partyId,
        paymentNumber: "",
        type: source.type,
        partyName: source.partyName,
        referenceNumber: source.referenceNumber,
        paymentDate: source.paymentDate,
        amount: source.amount,
        paymentMethod: source.paymentMethod,
        status: "pending",
        notes: source.notes,
      })
    },
    [addPayment]
  )

  const value = React.useMemo(
    () => ({
      payments,
      loading: isLoading,
      getPayment,
      addPayment,
      updatePayment,
      removePayment,
      duplicatePayment,
      removeMany,
      bulkCreate,
    }),
    [
      payments,
      isLoading,
      getPayment,
      addPayment,
      updatePayment,
      removePayment,
      duplicatePayment,
      removeMany,
      bulkCreate,
    ]
  )

  return (
    <PaymentsContext.Provider value={value}>{children}</PaymentsContext.Provider>
  )
}

export function usePayments() {
  const ctx = React.useContext(PaymentsContext)
  if (!ctx) {
    throw new Error("usePayments must be used within PaymentsProvider")
  }
  return ctx
}
