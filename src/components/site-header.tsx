"use client"

import { usePathname } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ToggleButton } from "@/components/ui/toggle-button"

function titleForPath(pathname: string | null): string {
  if (!pathname) return "Documents"
  if (pathname === "/dashboard/inventory") return "Inventory"
  if (pathname.startsWith("/dashboard/inventory/")) {
    if (pathname.includes("year-closing")) return "Year closing"
    if (pathname.includes("/terms/")) return "Term details"
    if (pathname.includes("/products")) return "Products"
    return "Inventory"
  }
  return "Documents"
}

export function SiteHeader() {
  const pathname = usePathname()
  const headerTitle = titleForPath(pathname)

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">{headerTitle}</h1>
        <div className="ml-auto flex min-w-0 items-center gap-2">
          <ToggleButton className="relative shrink-0 md:top-0 md:right-0" />
        </div>
      </div>
    </header>
  )
}
