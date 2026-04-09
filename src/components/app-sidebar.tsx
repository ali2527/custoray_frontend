"use client";
import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import {
  AlertCircle,
  Banknote,
  BarChart3,
  BookMarked,
  BookOpen,
  Box,
  Briefcase,
  Building2,
  Calendar,
  CalendarDays,
  CircleArrowDown,
  CircleArrowUp,
  ClipboardCheck,
  Clock,
  Coins,
  Database,
  FileBarChart,
  FileChartColumn,
  FileCheck,
  FilePlus,
  FileSpreadsheet,
  FileText,
  FileUp,
  Files,
  Folder,
  Folders,
  History,
  IdCard,
  LayoutDashboard,
  LayoutTemplate,
  LineChart,
  List,
  Monitor,
  NotebookPen,
  Package,
  PackagePlus,
  Percent,
  PieChart,
  Receipt,
  ReceiptText,
  RotateCcw,
  Settings,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Store,
  Tag,
  User,
  UserCheck,
  UserCircle,
  UserPlus,
  Users,
  UsersRound,
  Wallet,
} from "lucide-react"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar";

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Inventory",
      url: "/dashboard/inventory",
      icon: Package,
      items: [
        { title: "Products", url: "/dashboard/inventory/products", icon: Package },
        { title: "Brands", url: "/dashboard/inventory/brands", icon: Tag },
        { title: "Variants", url: "/dashboard/inventory/variants", icon: Box },
        { title: "Categories", url: "/dashboard/inventory/categories", icon: Folders },
        { title: "Year closing", url: "/dashboard/inventory/year-closing", icon: Calendar },
      ],
    },
    {
      title: "Customers",
      url: "#",
      icon: Users,
    },
    {
      title: "Vedors",
      url: "#",
      icon: Store,
    },
    {
      title: "Sales",
      url: "#",
      icon: BarChart3,
    },
    {
      title: "Purchase",
      url: "#",
      icon: Wallet,
    },
    {
      title: "Returns",
      url: "#",
      icon: RotateCcw,
    },
    {
      title: "Payments",
      url: "#",
      icon: CircleArrowUp,
      items: [
        { title: "Customer Payments", url: "#", icon: CircleArrowUp },
        { title: "Receive Payment", url: "#", icon: Banknote },
        { title: "Payment History", url: "#", icon: History },
        { title: "Outstanding", url: "#", icon: AlertCircle },
        { title: "Vendor Payments", url: "#", icon: CircleArrowDown },
        { title: "Make Payment", url: "#", icon: Wallet },
        { title: "Pending Payments", url: "#", icon: Clock },
      ],
    },
    {
      title: "Documents",
      url: "#",
      icon: FileText,
      items: [
        { title: "Sales Invoice", url: "#", icon: Receipt },
        { title: "Purchase Invoice", url: "#", icon: FileCheck },
        { title: "Invoice Templates", url: "#", icon: LayoutTemplate },
      ],
    },
    {
      title: "Tax",
      url: "#",
      icon: ReceiptText,
      items: [
        { title: "Tax Reports", url: "#", icon: FileBarChart },
        { title: "Tax Summary", url: "#", icon: FileText },
        { title: "Tax by Period", url: "#", icon: Calendar },
        { title: "Tax Compliance", url: "#", icon: ShieldCheck },
        { title: "Tax Settings", url: "#", icon: Settings },
        { title: "Tax Rates", url: "#", icon: Percent },
        { title: "Tax Groups", url: "#", icon: UsersRound },
        { title: "Tax Configuration", url: "#", icon: SlidersHorizontal },
        { title: "Tax Returns", url: "#", icon: FileUp },
        { title: "File Return", url: "#", icon: Files },
        { title: "Return History", url: "#", icon: History },
        { title: "Forms", url: "#", icon: FileText },
      ],
    },
    {
      title: "Employees",
      url: "#",
      icon: UserCircle,
      items: [
        { title: "Employee List", url: "#", icon: Users },
        { title: "All Employees", url: "#", icon: UsersRound },
        { title: "Add Employee", url: "#", icon: UserPlus },
        { title: "Employee Details", url: "#", icon: IdCard },
        { title: "Payroll", url: "#", icon: Wallet },
        { title: "Process Payroll", url: "#", icon: Banknote },
        { title: "Payroll History", url: "#", icon: History },
        { title: "Salary Slips", url: "#", icon: Receipt },
        { title: "Attendance", url: "#", icon: CalendarDays },
        { title: "Mark Attendance", url: "#", icon: ClipboardCheck },
        { title: "Attendance Report", url: "#", icon: FileBarChart },
        { title: "Leave Management", url: "#", icon: Calendar },
        { title: "Employee Management", url: "#", icon: UserCheck },
        { title: "Departments", url: "#", icon: Building2 },
        { title: "Designations", url: "#", icon: Briefcase },
        { title: "Employee Settings", url: "#", icon: Settings },
      ],
    },
    {
      title: "Zakat",
      url: "#",
      icon: Coins,
    },
    {
      title: "Reports",
      url: "#",
      icon: FileBarChart,
      items: [
        { title: "Sales Reports", url: "#", icon: LineChart },
        { title: "Purchase Reports", url: "#", icon: BarChart3 },
        { title: "Inventory Reports", url: "#", icon: FileChartColumn },
        { title: "Financial Reports", url: "#", icon: PieChart },
        { title: "Tax Reports", url: "#", icon: ReceiptText },
        { title: "Employee Reports", url: "#", icon: UserCircle },
        { title: "Payment Reports", url: "#", icon: Banknote },
        { title: "POS Reports", url: "#", icon: ShoppingCart },
        { title: "Ledger Reports", url: "#", icon: BookOpen },
        { title: "Custom Reports", url: "#", icon: FileSpreadsheet },
      ],
    },
    {
      title: "POS",
      url: "#",
      icon: ShoppingCart,
      items: [
        { title: "POS Sales", url: "#", icon: ShoppingCart },
        { title: "New Sale", url: "#", icon: PackagePlus },
        { title: "Sales History", url: "#", icon: History },
        { title: "Daily Sales", url: "#", icon: BarChart3 },
        { title: "POS Settings", url: "#", icon: Settings },
        { title: "POS Configuration", url: "#", icon: Monitor },
        { title: "Receipt Settings", url: "#", icon: Receipt },
        { title: "Payment Methods", url: "#", icon: Banknote },
        { title: "POS Reports", url: "#", icon: FileBarChart },
        { title: "Sales Report", url: "#", icon: LineChart },
        { title: "Product Report", url: "#", icon: FileChartColumn },
        { title: "Cashier Report", url: "#", icon: User },
      ],
    },
    {
      title: "Ledger",
      url: "#",
      icon: BookOpen,
      items: [
        { title: "Ledger", url: "#", icon: BookOpen },
        { title: "General Ledger", url: "#", icon: BookMarked },
        { title: "Account Ledger", url: "#", icon: List },
        { title: "Ledger Reports", url: "#", icon: FileBarChart },
        { title: "Journal", url: "#", icon: NotebookPen },
        { title: "Journal Entries", url: "#", icon: FilePlus },
        { title: "Journal Vouchers", url: "#", icon: Receipt },
        { title: "Journal Reports", url: "#", icon: FileText },
        { title: "Accounts", url: "#", icon: Database },
        { title: "Chart of Accounts", url: "#", icon: PieChart },
        { title: "Account Groups", url: "#", icon: Folder },
        { title: "Account Settings", url: "#", icon: Settings2 },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: Settings,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  // Check if RTL is enabled
  const [isRtl, setIsRtl] = React.useState(false)
  
  React.useEffect(() => {
    const checkRtl = () => {
      setIsRtl(document.documentElement.getAttribute('dir') === 'rtl')
    }
    
    checkRtl()
    // Watch for changes to dir attribute
    const observer = new MutationObserver(checkRtl)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['dir']
    })
    
    return () => observer.disconnect()
  }, [])
  
  return (
    <Sidebar collapsible="icon" side={isRtl ? "right" : "left"} {...props}>
      <SidebarHeader>
        <Link
          href="/dashboard"
          aria-label="Custoray home"
          className="hover:bg-sidebar-accent/60 -mx-0.5 flex items-center rounded-lg px-2 py-1.5 transition-colors group-data-[collapsible=icon]:justify-center"
        >
          <div className="flex h-10 w-full min-w-0 items-center justify-start group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:justify-center">
            <Image
              src="/assets/logo-2.png"
              alt="Custoray"
              width={320}
              height={96}
              className="h-10 w-auto max-w-full object-contain group-data-[collapsible=icon]:h-auto group-data-[collapsible=icon]:max-h-8 group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:max-w-8"
              sizes="(max-width: 768px) 100vw, 280px"
              priority
            />
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent className="hide-scrollbar overflow-y-auto h-full">
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
