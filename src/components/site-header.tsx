"use client"

import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ToggleButton } from "@/components/ui/toggle-button"

export function SiteHeader() {
  const pathname = usePathname()
  const isInventoryPage = pathname === "/dashboard/inventory"
  const headerTitle = isInventoryPage ? "Inventory" : "Documents"

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">{headerTitle}</h1>
        <div className="ml-auto flex items-center gap-2">
               <ToggleButton  className="relative md:top-0 md:right-0" />
         
        </div>
      </div>
    </header>
  )
}
