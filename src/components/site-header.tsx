"use client"

import { usePathname } from "next/navigation"
import { useTranslation } from "react-i18next"

import { NavUser } from "@/components/nav-user"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ToggleButton } from "@/components/ui/toggle-button"
import { TermSwitcher } from "@/components/term-switcher"
import { cn } from "@/lib/utils"

const headerControlShadow = "shadow-[0_1px_4px_0_rgba(0,0,0,0.16)]"

const headerIconCircleBtn = cn(
  "size-9 shrink-0 rounded-full border-0 bg-white text-muted-foreground hover:bg-primary/10 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/35 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-primary/15 dark:hover:text-primary",
  headerControlShadow
)

const sidebarTriggerClass =
  "size-9 shrink-0 rounded-2xl border-0 bg-transparent shadow-none text-muted-foreground hover:bg-primary/10 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/35 dark:text-zinc-400 dark:hover:bg-primary/15 dark:hover:text-primary"

function normalizePath(pathname: string | null): string {
  if (!pathname) return ""
  if (pathname.length > 1) return pathname.replace(/\/+$/, "")
  return pathname
}

function titleKeyForPath(pathname: string | null): string {
  const path = normalizePath(pathname)
  if (!path || path === "/home") return "header.dashboard"
  if (path === "/customers") return "header.customers"
  if (path.startsWith("/customers/")) {
    if (path.endsWith("/new")) return "header.addCustomer"
    if (path.endsWith("/edit")) return "header.editCustomer"
    if (path.endsWith("/timeline")) return "header.customerTimeline"
    return "header.customerDetails"
  }
  if (path === "/vendors") return "header.vendors"
  if (path === "/invoices") return "header.salesInvoice"
  if (path === "/documents/sales-invoice") return "header.salesInvoice"
  if (path === "/documents/purchase-invoice") return "header.purchaseInvoice"
  if (path === "/documents/invoice-templates") return "header.invoiceTemplates"
  if (path.startsWith("/documents/invoice-templates/preview/")) return "header.templatePreview"
  if (path.startsWith("/documents")) return "header.documents"
  if (path === "/purchases") return "header.purchases"
  if (path === "/sales") return "header.salesReport"
  if (path === "/reports/sales") return "header.salesReports"
  if (path === "/reports/purchases") return "header.purchaseReports"
  if (path === "/reports/inventory") return "header.inventoryReports"
  if (path === "/reports/payments") return "header.paymentReports"
  if (path === "/returns") return "header.returns"
  if (path === "/payments") return "header.payments"
  if (path === "/payments/customer") return "header.customerPayments"
  if (path === "/payments/vendor") return "header.vendorPayments"
  if (path === "/pos") return "header.posRegister"
  if (path === "/pos/new-sale") return "header.posRegister"
  if (path === "/pos/sales") return "header.salesHistory"
  if (path === "/pos/reports") return "header.posReports"
  if (path === "/pos/settings") return "header.posSettings"
  if (path.startsWith("/pos")) return "header.pos"
  if (path === "/qr-storefront" || path.startsWith("/qr-storefront/")) {
    return "header.qrStorefront"
  }
  if (path === "/inventory") return "header.inventory"
  if (path.startsWith("/inventory/")) {
    if (path.includes("year-closing")) return "header.yearClosing"
    if (path.includes("/terms/")) return "header.termDetails"
    if (path.includes("/products")) return "header.products"
    if (path.includes("/brands") || path.includes("/brand")) return "header.brands"
    if (path.includes("/categories")) return "header.categories"
    if (path.includes("/variants")) return "header.variants"
    return "header.inventory"
  }
  if (path === "/plans" || path.startsWith("/settings")) return "header.settings"
  if (path === "/employees") return "header.employees"
  if (path === "/employees/new") return "header.addEmployee"
  if (path === "/employees/permissions") return "header.permissions"
  if (path === "/employees/payroll") return "header.payroll"
  if (path === "/employees/attendance") return "header.attendance"
  if (path === "/employees/leaves") return "header.leaveManagement"
  if (path === "/employees/departments") return "header.departments"
  if (path.startsWith("/employees/") && path.endsWith("/edit")) return "header.editEmployee"
  if (path.startsWith("/employees/")) return "header.employeeProfile"
  if (path === "/zakat") return "header.zakatOverview"
  if (path === "/zakat/assets") return "header.zakatAssets"
  if (path === "/zakat/liabilities") return "header.zakatLiabilities"
  if (path === "/zakat/history") return "header.zakatHistory"
  if (path === "/zakat/settings") return "header.zakatSettings"
  if (path === "/zakat/calculator") return "header.zakatOverview"
  if (path.startsWith("/zakat")) return "header.zakat"
  if (path === "/tax") return "header.taxHelper"
  if (path === "/tax/profit-loss") return "header.profitLoss"
  if (path === "/tax/balance-sheet") return "header.balanceSheet"
  if (path === "/tax/year-summary") return "header.yearSummary"
  if (path === "/tax/settings") return "header.taxSettings"
  if (path.startsWith("/tax")) return "header.taxHelper"
  return "header.dashboard"
}

export function SiteHeader() {
  const pathname = usePathname()
  const { t } = useTranslation("nav")
  const headerTitle = t(titleKeyForPath(pathname))

  return (
    <header className="flex h-(--header-height) shrink-0 items-stretch border-b border-zinc-200/70 h-auto rounded-t-2xl transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) dark:border-zinc-800/80">
      <div className="flex w-full min-w-0 flex-1 items-center gap-3 px-4 py-3 lg:gap-4 lg:px-6">
        <SidebarTrigger className={cn(sidebarTriggerClass, "-ms-0.5")} />
        <Separator
          orientation="vertical"
          className="mx-0.5 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-foreground/70 min-w-0 flex-1 truncate text-base font-medium tracking-tight">
          {headerTitle}
        </h1>
        <div className="ms-auto flex shrink-0 items-center gap-2">
          <TermSwitcher triggerClassName={headerIconCircleBtn} />
          <ToggleButton layout="toolbar" variant="ghost" className={headerIconCircleBtn} />
          <NavUser />
        </div>
      </div>
    </header>
  )
}
