"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"

const TABS = [
  { href: "/settings", labelKey: "settingsNav.company" as const },
  { href: "/settings/documents", labelKey: "settingsNav.documents" as const },
  { href: "/settings/products", labelKey: "settingsNav.products" as const },
  { href: "/settings/account", labelKey: "settingsNav.account" as const },
  { href: "/settings/team", labelKey: "settingsNav.team" as const },
  { href: "/settings/appearance", labelKey: "settingsNav.appearance" as const },
  { href: "/settings/language", labelKey: "settingsNav.languageRegion" as const },
  { href: "/settings/notifications", labelKey: "settingsNav.notifications" as const },
  { href: "/settings/billing", labelKey: "settingsNav.plansBilling" as const },
] as const

function isActive(pathname: string, href: string) {
  if (href === "/settings") return pathname === "/settings"
  if (href === "/settings/appearance") {
    return (
      pathname === href ||
      pathname.startsWith("/settings/appearance") ||
      pathname.startsWith("/settings/preferences")
    )
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function SettingsTabs() {
  const pathname = usePathname() ?? ""
  const { t } = useTranslation("nav")

  return (
    <nav className="border-border w-full overflow-x-auto border-b">
      <div className="-mb-px flex min-w-max gap-x-1">
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "relative z-10 shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground border-transparent"
              )}
            >
              {t(tab.labelKey)}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
