"use client"

import * as React from "react"
import { type PayrollRecord } from "@/lib/employee-payroll"
import { nextUniqueNumericId } from "@/lib/utils"

type PayrollContextValue = {
  records: PayrollRecord[]
  setRecords: React.Dispatch<React.SetStateAction<PayrollRecord[]>>
  addRecord: (row: Omit<PayrollRecord, "id">) => PayrollRecord
  updateRecord: (id: number, patch: Partial<PayrollRecord>) => void
  removeRecord: (id: number) => void
  getRecordsForEmployee: (employeeId: number) => PayrollRecord[]
}

const PayrollContext = React.createContext<PayrollContextValue | null>(null)

export function PayrollProvider({ children }: { children: React.ReactNode }) {
  const [records, setRecords] = React.useState<PayrollRecord[]>([])

  const addRecord = React.useCallback((row: Omit<PayrollRecord, "id">) => {
    let created = { ...row, id: 0 } as PayrollRecord
    setRecords((prev) => {
      const id = nextUniqueNumericId(prev)
      created = { ...row, id }
      return [...prev, created]
    })
    return created
  }, [])

  const updateRecord = React.useCallback((id: number, patch: Partial<PayrollRecord>) => {
    setRecords((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch, id: row.id } : row))
    )
  }, [])

  const removeRecord = React.useCallback((id: number) => {
    setRecords((prev) => prev.filter((row) => row.id !== id))
  }, [])

  const getRecordsForEmployee = React.useCallback(
    (employeeId: number) =>
      records.filter((row) => row.employeeId === employeeId).sort((a, b) =>
        b.period.localeCompare(a.period)
      ),
    [records]
  )

  const value = React.useMemo(
    () => ({
      records,
      setRecords,
      addRecord,
      updateRecord,
      removeRecord,
      getRecordsForEmployee,
    }),
    [records, addRecord, updateRecord, removeRecord, getRecordsForEmployee]
  )

  return <PayrollContext.Provider value={value}>{children}</PayrollContext.Provider>
}

export function usePayroll() {
  const ctx = React.useContext(PayrollContext)
  if (!ctx) throw new Error("usePayroll must be used within PayrollProvider")
  return ctx
}
