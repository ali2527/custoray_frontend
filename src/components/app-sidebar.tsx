"use client";
import * as React from "react"
import {
  IconRestore,
  IconChartBar,
  IconLayoutDashboard,
  IconUserStar,
  IconMoneybag,
  IconFileInvoice,
  IconHelp,
  IconPackage,
  IconUsers,
  IconSearch,
  IconSettings,
  IconUserUp,
  IconUserDown,
  IconReceiptTax,
  IconUserCircle,
  IconCoins,
  IconShoppingCart,
  IconBook,
  IconFileText,
  IconCalculator,
  IconReport,
  IconCash,
  IconClock,
  IconUserCheck,
  IconShoppingBag,
  IconDeviceDesktop,
  IconNotebook,
  IconList,
  IconTag,
  IconBox,
  IconFolders,
  IconFilePlus,
  IconHistory,
  IconAlertCircle,
  IconFileCheck,
  IconTemplate,
  IconTrendingUp,
  IconCalendar,
  IconShieldCheck,
  IconAdjustments,
  IconPercentage,
  IconUsersGroup,
  IconFileUpload,
  IconFiles,
  IconUserPlus,
  IconId,
  IconWallet,
  IconReceipt,
  IconClipboardText,
  IconCalendarEvent,
  IconClipboardCheck,
  IconBuilding,
  IconBriefcase,
  IconTools,
  IconMath,
  IconChartPie,
  IconShare,
  IconRuler,
  IconShoppingCartPlus,
  IconReceiptRefund,
  IconChartLine,
  IconFileAnalytics,
  IconUser,
  IconBook2,
  IconFileSpreadsheet,
  IconDatabase,
  IconFolder,
} from "@tabler/icons-react";
import {

  AudioWaveform,

  Command,

  GalleryVerticalEnd,
} from "lucide-react"
import { TeamSwitcher } from "@/components/team-switcher"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar";

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Acme Inc",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: Command,
      plan: "Free",
    },
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconLayoutDashboard,
    },
    {
      title: "Inventory",
      url: "/dashboard/inventory",
      icon: IconPackage,
      items: [
        { title: "Products", url: "/dashboard/inventory/products", icon: IconPackage },
        { title: "Brand", url: "/dashboard/inventory/brand", icon: IconTag },
        { title: "Variants", url: "/dashboard/inventory/variants", icon: IconBox },
        { title: "Categories", url: "/dashboard/inventory/categories", icon: IconFolders },
      ],
    },
    {
      title: "Customers",
      url: "#",
      icon: IconUsers,
    },
    {
      title: "Vedors",
      url: "#",
      icon: IconUserStar,
    },
    {
      title: "Sales",
      url: "#",
      icon: IconChartBar,
    },
    {
      title: "Purchase",
      url: "#",
      icon: IconMoneybag,
    },
    {
      title: "Returns",
      url: "#",
      icon: IconRestore,
    },
    {
      title: "Payments",
      url: "#",
      icon: IconUserUp,
      items: [
        { title: "Customer Payments", url: "#", icon: IconUserUp },
        { title: "Receive Payment", url: "#", icon: IconCash },
        { title: "Payment History", url: "#", icon: IconHistory },
        { title: "Outstanding", url: "#", icon: IconAlertCircle },
        { title: "Vendor Payments", url: "#", icon: IconUserDown },
        { title: "Make Payment", url: "#", icon: IconMoneybag },
        { title: "Pending Payments", url: "#", icon: IconClock },
      ],
    },
    {
      title: "Documents",
      url: "#",
      icon: IconFileInvoice,
      items: [
        { title: "Sales Invoice", url: "#", icon: IconFileInvoice },
        { title: "Purchase Invoice", url: "#", icon: IconFileCheck },
        { title: "Invoice Templates", url: "#", icon: IconTemplate },
      ],
    },
    {
      title: "Tax",
      url: "#",
      icon: IconReceiptTax,
      items: [
        { title: "Tax Reports", url: "#", icon: IconReport },
        { title: "Tax Summary", url: "#", icon: IconFileText },
        { title: "Tax by Period", url: "#", icon: IconCalendar },
        { title: "Tax Compliance", url: "#", icon: IconShieldCheck },
        { title: "Tax Settings", url: "#", icon: IconSettings },
        { title: "Tax Rates", url: "#", icon: IconPercentage },
        { title: "Tax Groups", url: "#", icon: IconUsersGroup },
        { title: "Tax Configuration", url: "#", icon: IconAdjustments },
        { title: "Tax Returns", url: "#", icon: IconFileUpload },
        { title: "File Return", url: "#", icon: IconFiles },
        { title: "Return History", url: "#", icon: IconHistory },
        { title: "Forms", url: "#", icon: IconFileText },
      ],
    },
    {
      title: "Employees",
      url: "#",
      icon: IconUserCircle,
      items: [
        { title: "Employee List", url: "#", icon: IconUsers },
        { title: "All Employees", url: "#", icon: IconUsersGroup },
        { title: "Add Employee", url: "#", icon: IconUserPlus },
        { title: "Employee Details", url: "#", icon: IconId },
        { title: "Payroll", url: "#", icon: IconWallet },
        { title: "Process Payroll", url: "#", icon: IconCash },
        { title: "Payroll History", url: "#", icon: IconHistory },
        { title: "Salary Slips", url: "#", icon: IconReceipt },
        { title: "Attendance", url: "#", icon: IconCalendarEvent },
        { title: "Mark Attendance", url: "#", icon: IconClipboardCheck },
        { title: "Attendance Report", url: "#", icon: IconReport },
        { title: "Leave Management", url: "#", icon: IconCalendar },
        { title: "Employee Management", url: "#", icon: IconUserCheck },
        { title: "Departments", url: "#", icon: IconBuilding },
        { title: "Designations", url: "#", icon: IconBriefcase },
        { title: "Employee Settings", url: "#", icon: IconSettings },
      ],
    },
    {
      title: "Zakat",
      url: "#",
      icon: IconCoins,
    },
    {
      title: "Reports",
      url: "#",
      icon: IconReport,
      items: [
        { title: "Sales Reports", url: "#", icon: IconChartLine },
        { title: "Purchase Reports", url: "#", icon: IconChartBar },
        { title: "Inventory Reports", url: "#", icon: IconFileAnalytics },
        { title: "Financial Reports", url: "#", icon: IconChartPie },
        { title: "Tax Reports", url: "#", icon: IconReceiptTax },
        { title: "Employee Reports", url: "#", icon: IconUserCircle },
        { title: "Payment Reports", url: "#", icon: IconCash },
        { title: "POS Reports", url: "#", icon: IconShoppingCart },
        { title: "Ledger Reports", url: "#", icon: IconBook },
        { title: "Custom Reports", url: "#", icon: IconFileSpreadsheet },
      ],
    },
    {
      title: "POS",
      url: "#",
      icon: IconShoppingCart,
      items: [
        { title: "POS Sales", url: "#", icon: IconShoppingCart },
        { title: "New Sale", url: "#", icon: IconShoppingCartPlus },
        { title: "Sales History", url: "#", icon: IconHistory },
        { title: "Daily Sales", url: "#", icon: IconChartBar },
        { title: "POS Settings", url: "#", icon: IconSettings },
        { title: "POS Configuration", url: "#", icon: IconDeviceDesktop },
        { title: "Receipt Settings", url: "#", icon: IconReceipt },
        { title: "Payment Methods", url: "#", icon: IconCash },
        { title: "POS Reports", url: "#", icon: IconReport },
        { title: "Sales Report", url: "#", icon: IconChartLine },
        { title: "Product Report", url: "#", icon: IconFileAnalytics },
        { title: "Cashier Report", url: "#", icon: IconUser },
      ],
    },
    {
      title: "Ledger",
      url: "#",
      icon: IconBook,
      items: [
        { title: "Ledger", url: "#", icon: IconBook },
        { title: "General Ledger", url: "#", icon: IconBook2 },
        { title: "Account Ledger", url: "#", icon: IconList },
        { title: "Ledger Reports", url: "#", icon: IconReport },
        { title: "Journal", url: "#", icon: IconNotebook },
        { title: "Journal Entries", url: "#", icon: IconFilePlus },
        { title: "Journal Vouchers", url: "#", icon: IconReceipt },
        { title: "Journal Reports", url: "#", icon: IconFileText },
        { title: "Accounts", url: "#", icon: IconDatabase },
        { title: "Chart of Accounts", url: "#", icon: IconChartPie },
        { title: "Account Groups", url: "#", icon: IconFolder },
        { title: "Account Settings", url: "#", icon: IconTools },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: IconSettings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: IconHelp,
    },
    {
      title: "Search",
      url: "#",
      icon: IconSearch,
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
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent className="hide-scrollbar overflow-y-auto h-full">
        <NavMain items={data.navMain} />

        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
