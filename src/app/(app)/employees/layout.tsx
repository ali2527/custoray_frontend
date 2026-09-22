import { ComingSoonOverlay } from "@/components/coming-soon-overlay"
import { EmployeesAdminGuard } from "@/components/employees/employees-admin-guard"

export default function EmployeesSectionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <EmployeesAdminGuard>
      <ComingSoonOverlay>{children}</ComingSoonOverlay>
    </EmployeesAdminGuard>
  )
}
