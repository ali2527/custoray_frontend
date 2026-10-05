"use client"

import { use } from "react"

import { EmployeeProfilePage } from "@/components/employees/employee-profile-page"

export default function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  return <EmployeeProfilePage employeeId={Number(id)} />
}
