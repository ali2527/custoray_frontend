"use client";
import * as React from "react"
import { useTranslation } from "react-i18next"
import {
  Banknote,
  BarChart3,
  Box,
  Building2,
  Calendar,
  CalendarDays,
  CircleArrowDown,
  CircleArrowUp,
  Coins,
  FileBarChart,
  FileChartColumn,
  FileCheck,
  FileText,
  Folders,
  History,
  LayoutDashboard,
  LayoutTemplate,
  LineChart,
  Package,
  QrCode,
  Receipt,
  RotateCcw,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Store,
  Tag,
  UserCircle,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import { NavMain } from "@/components/nav-main"
import { SidebarNavPendingProvider } from "@/components/sidebar-nav-pending"
import { CompanySwitcher } from "@/components/company-switcher"
import { PlanStatusCard } from "@/components/saas/plan-status-card"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, useSidebar } from "@/components/ui/sidebar";
import { useAuth } from "@/context/auth-context"
import { useCatalogFieldSettings } from "@/hooks/use-catalog-field-settings"
import { cn } from "@/lib/utils"

type NavKey =
  | "sidebar.dashboard"
  | "sidebar.inventory"
  | "sidebar.products"
  | "sidebar.brands"
  | "sidebar.variants"
  | "sidebar.categories"
  | "sidebar.customers"
  | "sidebar.vendors"
  | "sidebar.sales"
  | "sidebar.purchase"
  | "sidebar.returns"
  | "sidebar.payments"
  | "sidebar.customerPayments"
  | "sidebar.vendorPayments"
  | "sidebar.expenses"
  | "sidebar.allExpenses"
  | "sidebar.expenseTypes"
  | "sidebar.documents"
  | "sidebar.salesInvoice"
  | "sidebar.purchaseInvoice"
  | "sidebar.invoiceTemplates"
  | "sidebar.pos"
  | "sidebar.register"
  | "sidebar.salesHistory"
  | "sidebar.returnsHistory"
  | "sidebar.reports"
  | "sidebar.analytics"
  | "sidebar.settings"
  | "sidebar.employees"
  | "sidebar.team"
  | "sidebar.permissions"
  | "sidebar.payroll"
  | "sidebar.attendance"
  | "sidebar.leave"
  | "sidebar.departments"
  | "sidebar.zakat"
  | "sidebar.overview"
  | "sidebar.assets"
  | "sidebar.liabilities"
  | "sidebar.history"
  | "sidebar.salesReports"
  | "sidebar.purchaseReports"
  | "sidebar.inventoryReports"
  | "sidebar.paymentReports"
  | "sidebar.qrStorefront"

type NavDef = {
  id: string
  titleKey: NavKey
  url: string
  icon: LucideIcon
  items?: { titleKey: NavKey; url: string; icon: LucideIcon }[]
}

const navMain: NavDef[] = [
  {
    id: "dashboard",
    titleKey: "sidebar.dashboard",
    url: "/home",
    icon: LayoutDashboard,
  },
  {
    id: "inventory",
    titleKey: "sidebar.inventory",
    url: "/inventory",
    icon: Package,
    items: [
      { titleKey: "sidebar.products", url: "/inventory/products", icon: Package },
      { titleKey: "sidebar.brands", url: "/inventory/brands", icon: Tag },
      { titleKey: "sidebar.variants", url: "/inventory/variants", icon: Box },
      { titleKey: "sidebar.categories", url: "/inventory/categories", icon: Folders },
    ],
  },
  {
    id: "customers",
    titleKey: "sidebar.customers",
    url: "/customers",
    icon: Users,
  },
  {
    id: "vendors",
    titleKey: "sidebar.vendors",
    url: "/vendors",
    icon: Store,
  },
  {
    id: "sales",
    titleKey: "sidebar.sales",
    url: "/sales",
    icon: BarChart3,
  },
  {
    id: "purchase",
    titleKey: "sidebar.purchase",
    url: "/purchases",
    icon: Wallet,
  },
  {
    id: "returns",
    titleKey: "sidebar.returns",
    url: "/returns",
    icon: RotateCcw,
  },
  {
    id: "payments",
    titleKey: "sidebar.payments",
    url: "/payments/customer",
    icon: Banknote,
    items: [
      { titleKey: "sidebar.customerPayments", url: "/payments/customer", icon: CircleArrowUp },
      { titleKey: "sidebar.vendorPayments", url: "/payments/vendor", icon: CircleArrowDown },
    ],
  },
  {
    id: "expenses",
    titleKey: "sidebar.expenses",
    url: "/expenses",
    icon: Wallet,
    items: [
      { titleKey: "sidebar.allExpenses", url: "/expenses", icon: Receipt },
      { titleKey: "sidebar.expenseTypes", url: "/expenses/types", icon: Tag },
    ],
  },
  {
    id: "documents",
    titleKey: "sidebar.documents",
    url: "/documents/sales-invoice",
    icon: FileText,
    items: [
      { titleKey: "sidebar.salesInvoice", url: "/documents/sales-invoice", icon: Receipt },
      { titleKey: "sidebar.purchaseInvoice", url: "/documents/purchase-invoice", icon: FileCheck },
      { titleKey: "sidebar.invoiceTemplates", url: "/documents/invoice-templates", icon: LayoutTemplate },
    ],
  },
  {
    id: "pos",
    titleKey: "sidebar.pos",
    url: "/pos",
    icon: ShoppingCart,
    items: [
      { titleKey: "sidebar.register", url: "/pos", icon: ShoppingCart },
      { titleKey: "sidebar.salesHistory", url: "/pos/sales", icon: History },
      { titleKey: "sidebar.returnsHistory", url: "/pos/returns", icon: RotateCcw },
      { titleKey: "sidebar.reports", url: "/pos/reports", icon: FileBarChart },
      { titleKey: "sidebar.settings", url: "/pos/settings", icon: Settings },
    ],
  },
  {
    id: "employees",
    titleKey: "sidebar.employees",
    url: "/employees",
    icon: UserCircle,
    items: [
      { titleKey: "sidebar.team", url: "/employees", icon: Users },
      { titleKey: "sidebar.permissions", url: "/employees/permissions", icon: ShieldCheck },
      { titleKey: "sidebar.payroll", url: "/employees/payroll", icon: Wallet },
      { titleKey: "sidebar.attendance", url: "/employees/attendance", icon: Calendar },
      { titleKey: "sidebar.leave", url: "/employees/leaves", icon: CalendarDays },
      { titleKey: "sidebar.departments", url: "/employees/departments", icon: Building2 },
    ],
  },
  {
    id: "zakat",
    titleKey: "sidebar.zakat",
    url: "/zakat",
    icon: Coins,
    items: [
      { titleKey: "sidebar.overview", url: "/zakat", icon: BarChart3 },
      { titleKey: "sidebar.assets", url: "/zakat/assets", icon: Box },
      { titleKey: "sidebar.liabilities", url: "/zakat/liabilities", icon: Wallet },
      { titleKey: "sidebar.history", url: "/zakat/history", icon: History },
      { titleKey: "sidebar.settings", url: "/zakat/settings", icon: Settings },
    ],
  },
  {
    id: "reports",
    titleKey: "sidebar.analytics",
    url: "#",
    icon: FileBarChart,
    items: [
      { titleKey: "sidebar.salesReports", url: "/reports/sales", icon: LineChart },
      { titleKey: "sidebar.purchaseReports", url: "/reports/purchases", icon: BarChart3 },
      { titleKey: "sidebar.inventoryReports", url: "/reports/inventory", icon: FileChartColumn },
      { titleKey: "sidebar.paymentReports", url: "/reports/payments", icon: Banknote },
    ],
  },
  {
    id: "qr-storefront",
    titleKey: "sidebar.qrStorefront",
    url: "/qr-storefront",
    icon: QrCode,
  },
  {
    id: "settings",
    titleKey: "sidebar.settings",
    url: "/settings",
    icon: Settings,
  },
]

function SidebarBrand() {
  const { state } = useSidebar()
  const collapsed = state === "collapsed"

  return (
    <SidebarHeader
      className={cn(collapsed && "items-center px-1.5 pt-4 pb-2")}
    >
      <CompanySwitcher />
    </SidebarHeader>
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { canAdmin } = useAuth()
  const { t } = useTranslation("nav")
  const { settings: catalogTables } = useCatalogFieldSettings()
  const navItems = React.useMemo(
    () =>
      navMain
        .filter((item) => item.id !== "employees" || canAdmin)
        .map((item) => ({
          title: t(item.titleKey),
          url: item.url,
          icon: item.icon,
          items: item.items
            ?.filter((sub) => {
              if (sub.url === "/inventory/brands") return catalogTables.brand
              if (sub.url === "/inventory/categories") return catalogTables.category
              if (sub.url === "/inventory/variants") return catalogTables.variant
              return true
            })
            .map((sub) => ({
              title: t(sub.titleKey),
              url: sub.url,
              icon: sub.icon,
            })),
        })),
    [canAdmin, catalogTables, t]
  )
  const [isRtl, setIsRtl] = React.useState(false)

  React.useEffect(() => {
    const checkRtl = () => {
      setIsRtl(document.documentElement.getAttribute("dir") === "rtl")
    }

    checkRtl()
    const observer = new MutationObserver(checkRtl)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["dir"],
    })

    return () => observer.disconnect()
  }, [])

  return (
    <SidebarNavPendingProvider>
      <Sidebar collapsible="icon" side={isRtl ? "right" : "left"} {...props}>
        <SidebarBrand />
        <SidebarContent className="hide-scrollbar overflow-y-auto h-full">
          <NavMain items={navItems} />
        </SidebarContent>
        <SidebarFooter>
          <PlanStatusCard />
        </SidebarFooter>
      </Sidebar>
    </SidebarNavPendingProvider>
  )
}
