"use client"

import { ChevronRight, Mail, Plus, type LucideIcon } from "lucide-react"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  SidebarNavLink,
  NavPendingIndicator,
} from "@/components/sidebar-nav-pending"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"

function getThemeIconColor(): string {
  if (typeof document === "undefined") return ""

  const theme = document.documentElement.getAttribute("data-theme") || "default"

  const themeColorMap: Record<string, string> = {
    default: "",
    red: "text-red-100",
    rose: "text-rose-100",
    orange: "text-orange-500",
    yellow: "text-yellow-500",
    green: "text-green-500",
    blue: "text-blue-500",
    violet: "text-violet-500",
    purple: "text-purple-500",
    pink: "text-pink-500",
    cyan: "text-cyan-500",
    teal: "text-teal-500",
    indigo: "text-indigo-500",
    emerald: "text-emerald-500",
    amber: "text-amber-500",
    lime: "text-lime-500",
    sky: "text-sky-500",
    fuchsia: "text-fuchsia-500",
  }

  return themeColorMap[theme] || ""
}

type NavItem = {
  title: string
  url: string
  icon?: LucideIcon
  items?: {
    title: string
    url: string
  }[]
}

const navRowClass = "min-h-10 h-auto gap-3 px-3 py-2"
const navSubLinkClass = "min-h-10 h-auto px-3 py-2.5"

function NavSubLinkItem({
  subItem,
  pathname,
}: {
  subItem: { title: string; url: string }
  pathname: string | null
}) {
  const isSubActive =
    pathname === subItem.url ||
    (subItem.url !== "/home" &&
      subItem.url !== "#" &&
      pathname?.startsWith(subItem.url))
  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton
        asChild
        isActive={isSubActive}
        size="md"
        className={navSubLinkClass}
      >
        <SidebarNavLink href={subItem.url}>
          <span className="min-w-0 truncate">{subItem.title}</span>
          <NavPendingIndicator href={subItem.url} />
        </SidebarNavLink>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  )
}

function NavMainLinkItem({
  item,
  isActive,
}: {
  item: NavItem
  isActive: boolean
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        tooltip={item.title}
        isActive={isActive}
        className={navRowClass}
      >
        <SidebarNavLink href={item.url} className="flex w-full min-w-0 items-center gap-3">
          {item.icon && <item.icon className="size-[1.125rem] shrink-0" strokeWidth={2} data-theme-icon />}
          <span className="min-w-0 truncate">{item.title}</span>
          <NavPendingIndicator href={item.url} />
        </SidebarNavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function NavCollapsibleItem({
  item,
  pathname,
}: {
  item: NavItem
  pathname: string | null
}) {
  const { state, isMobile, toggleSidebar } = useSidebar()
  const isActive =
    pathname === item.url ||
    (item.url !== "/home" && item.url !== "#" && pathname?.startsWith(item.url))
  const [open, setOpen] = useState(isActive)

  useEffect(() => {
    if (isActive) setOpen(true)
  }, [isActive])

  const handleOpenChange = (next: boolean) => {
    if (state === "collapsed" && !isMobile) {
      toggleSidebar()
      setOpen(true)
      return
    }
    setOpen(next)
  }

  return (
    <SidebarMenuItem>
      <Collapsible open={open} onOpenChange={handleOpenChange} className="group/collapsible w-full">
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            isActive={isActive}
            title={item.title}
            type="button"
            className={navRowClass}
          >
            {item.icon && <item.icon data-theme-icon />}
            <span>{item.title}</span>
            <ChevronRight
              className="ms-auto size-[1.125rem] transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 rtl:rotate-180 group-data-[state=open]/collapsible:rtl:rotate-90"
              strokeWidth={2}
              data-theme-icon
              aria-hidden
            />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="gap-1.5 py-1">
            {item.items?.map((subItem) => (
              <NavSubLinkItem
                key={subItem.title}
                subItem={subItem}
                pathname={pathname}
              />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  )
}

export function NavMain({ items }: { items: NavItem[] }) {
  const pathname = usePathname()
  const { t } = useTranslation("nav")
  const [, setIconColorClass] = useState("")

  useEffect(() => {
    const updateIconColor = () => {
      setIconColorClass(getThemeIconColor())
    }

    updateIconColor()

    const observer = new MutationObserver(updateIconColor)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    })

    return () => observer.disconnect()
  }, [])

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2.5">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
              tooltip={t("quickCreate")}
              className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 text-xs duration-200 ease-linear"
            >
              <Plus className="size-[1.125rem]" strokeWidth={2.25} aria-hidden />
              <span className="text-xs font-medium">{t("quickCreate")}</span>
            </SidebarMenuButton>
            <Button
              size="icon"
              className="size-8 group-data-[collapsible=icon]:opacity-0"
              variant="outline"
            >
              <Mail className="size-[1.125rem]" strokeWidth={2} aria-hidden />
              <span className="sr-only">{t("inbox")}</span>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu className="gap-1.5 px-1">
          {items.map((item) => {
            const isActive =
              pathname === item.url ||
              (item.url !== "/home" &&
                item.url !== "#" &&
                pathname?.startsWith(item.url))

            if (item.items && item.items.length > 0) {
              return (
                <NavCollapsibleItem key={item.title} item={item} pathname={pathname} />
              )
            }

            return (
              <NavMainLinkItem key={item.title} item={item} isActive={isActive} />
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
