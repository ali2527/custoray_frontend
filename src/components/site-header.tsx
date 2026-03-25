"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Settings } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ToggleButton } from "@/components/ui/toggle-button"
import { TermSwitcher } from "@/components/term-switcher"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

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
  const [settingsOpen, setSettingsOpen] = React.useState(false)

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
          <TermSwitcher />
          <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="relative shrink-0"
                aria-label="Open settings menu"
              >
                <Settings className="size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={6} className="w-56 p-3">
              <div className="space-y-2">
                <p className="text-sm font-medium">Settings</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Theme, color palette, language, and other preferences.
                </p>
                <Button asChild className="w-full" size="sm">
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setSettingsOpen(false)}
                  >
                    Go to settings
                  </Link>
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <ToggleButton layout="toolbar" />
        </div>
      </div>
    </header>
  )
}
