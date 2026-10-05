"use client"

import { use } from "react"

import { EmployeeFormPage } from "@/components/employees/employee-form-page"
import { useEmployees } from "@/context/employees-context"

export default function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { getEmployee } = useEmployees()
  const employee = getEmployee(Number(id))

  if (!employee) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">Employee not found.</p>
    )
  }

  return <EmployeeFormPage mode="edit" employee={employee} />
}
