"use client"

import * as React from "react"
import { type EmployeeRow } from "@/lib/employees"
import { nextUniqueNumericId } from "@/lib/utils"

type EmployeesContextValue = {
  employees: EmployeeRow[]
  setEmployees: React.Dispatch<React.SetStateAction<EmployeeRow[]>>
  getEmployee: (id: number) => EmployeeRow | undefined
  addEmployee: (employee: Omit<EmployeeRow, "id">) => EmployeeRow
  updateEmployee: (id: number, patch: Partial<EmployeeRow>) => void
  removeEmployee: (id: number) => void
}

const EmployeesContext = React.createContext<EmployeesContextValue | null>(null)

export function EmployeesProvider({ children }: { children: React.ReactNode }) {
  const [employees, setEmployees] = React.useState<EmployeeRow[]>([])

  const getEmployee = React.useCallback(
    (id: number) => employees.find((employee) => employee.id === id),
    [employees]
  )

  const addEmployee = React.useCallback((employee: Omit<EmployeeRow, "id">) => {
    let created = { ...employee, id: 0 } as EmployeeRow
    setEmployees((prev) => {
      const id = nextUniqueNumericId(prev)
      created = { ...employee, id }
      return [...prev, created]
    })
    return created
  }, [])

  const updateEmployee = React.useCallback((id: number, patch: Partial<EmployeeRow>) => {
    setEmployees((prev) =>
      prev.map((employee) =>
        employee.id === id ? { ...employee, ...patch, id: employee.id } : employee
      )
    )
  }, [])

  const removeEmployee = React.useCallback((id: number) => {
    setEmployees((prev) => prev.filter((employee) => employee.id !== id))
  }, [])

  const value = React.useMemo(
    () => ({
      employees,
      setEmployees,
      getEmployee,
      addEmployee,
      updateEmployee,
      removeEmployee,
    }),
    [employees, getEmployee, addEmployee, updateEmployee, removeEmployee]
  )

  return (
    <EmployeesContext.Provider value={value}>{children}</EmployeesContext.Provider>
  )
}

export function useEmployees() {
  const ctx = React.useContext(EmployeesContext)
  if (!ctx) {
    throw new Error("useEmployees must be used within EmployeesProvider")
  }
  return ctx
}
