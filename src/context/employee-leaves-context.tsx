"use client"

import * as React from "react"
import { type LeaveRecord } from "@/lib/employee-leaves"
import { nextUniqueNumericId } from "@/lib/utils"

type LeavesContextValue = {
  records: LeaveRecord[]
  setRecords: React.Dispatch<React.SetStateAction<LeaveRecord[]>>
  addRecord: (row: Omit<LeaveRecord, "id">) => LeaveRecord
  updateRecord: (id: number, patch: Partial<LeaveRecord>) => void
  removeRecord: (id: number) => void
  getRecordsForEmployee: (employeeId: number) => LeaveRecord[]
}

const LeavesContext = React.createContext<LeavesContextValue | null>(null)

export function LeavesProvider({ children }: { children: React.ReactNode }) {
  const [records, setRecords] = React.useState<LeaveRecord[]>([])

  const addRecord = React.useCallback((row: Omit<LeaveRecord, "id">) => {
    let created = { ...row, id: 0 } as LeaveRecord
    setRecords((prev) => {
      const id = nextUniqueNumericId(prev)
      created = { ...row, id }
      return [...prev, created]
    })
    return created
  }, [])

  const updateRecord = React.useCallback((id: number, patch: Partial<LeaveRecord>) => {
    setRecords((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch, id: row.id } : row))
    )
  }, [])

  const removeRecord = React.useCallback((id: number) => {
    setRecords((prev) => prev.filter((row) => row.id !== id))
  }, [])

  const getRecordsForEmployee = React.useCallback(
    (employeeId: number) =>
      records
        .filter((row) => row.employeeId === employeeId)
        .sort((a, b) => b.startDate.localeCompare(a.startDate)),
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

  return <LeavesContext.Provider value={value}>{children}</LeavesContext.Provider>
}

export function useLeaves() {
  const ctx = React.useContext(LeavesContext)
  if (!ctx) throw new Error("useLeaves must be used within LeavesProvider")
  return ctx
}
