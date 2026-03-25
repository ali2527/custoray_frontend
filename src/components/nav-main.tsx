"use client"

import { ChevronRight, Mail, Plus, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
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
} from "@/components/ui/sidebar"
import { useEffect, useState } from "react"

// Function to get theme-based icon color class
function getThemeIconColor(): string {
  if (typeof document === 'undefined') return ''
  
  const theme = document.documentElement.getAttribute('data-theme') || 'default'
  
  const themeColorMap: Record<string, string> = {
    'default': '',
    'red': 'text-red-100',
    'rose': 'text-rose-100',
    'orange': 'text-orange-500',
    'yellow': 'text-yellow-500',
    'green': 'text-green-500',
    'blue': 'text-blue-500',
    'violet': 'text-violet-500',
    'purple': 'text-purple-500',
    'pink': 'text-pink-500',
    'cyan': 'text-cyan-500',
    'teal': 'text-teal-500',
    'indigo': 'text-indigo-500',
    'emerald': 'text-emerald-500',
    'amber': 'text-amber-500',
    'lime': 'text-lime-500',
    'sky': 'text-sky-500',
    'fuchsia': 'text-fuchsia-500',
  }
  
  return themeColorMap[theme] || ''
}

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  const pathname = usePathname()
  const [iconColorClass, setIconColorClass] = useState('')

  useEffect(() => {
    const updateIconColor = () => {
      setIconColorClass(getThemeIconColor())
    }
    
    updateIconColor()
    
    // Watch for theme changes
    const observer = new MutationObserver(updateIconColor)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    })
    
    return () => observer.disconnect()
  }, [])

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2.5">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
              tooltip="Quick Create"
              className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 text-xs duration-200 ease-linear"
            >
              <Plus className="size-[1.125rem]" strokeWidth={2.25} aria-hidden />
              <span className="text-xs font-medium">Quick Create</span>
            </SidebarMenuButton>
            <Button
              size="icon"
              className="size-8 group-data-[collapsible=icon]:opacity-0"
              variant="outline"
            >
              <Mail className="size-[1.125rem]" strokeWidth={2} aria-hidden />
              <span className="sr-only">Inbox</span>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {items.map((item) => {
            const isActive = pathname === item.url || (item.url !== "/dashboard" && pathname?.startsWith(item.url))
            
            // If item has nested items, make it collapsible
            if (item.items && item.items.length > 0) {
              return (
                <Collapsible
                  key={item.title}
                  asChild
                  defaultOpen={isActive}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      {/* No tooltip here: Tooltip wraps the button and breaks CollapsibleTrigger asChild composition */}
                      <SidebarMenuButton
                        isActive={isActive}
                        title={item.title}
                      >
                        {item.icon && <item.icon data-theme-icon />}
                        <span>{item.title}</span>
                        <ChevronRight
                          className="ml-auto size-[1.125rem] transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                          strokeWidth={2}
                          data-theme-icon
                          aria-hidden
                        />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items.map((subItem) => {
                          const isSubActive = pathname === subItem.url || (subItem.url !== "/dashboard" && pathname?.startsWith(subItem.url))
                          return (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton asChild isActive={isSubActive}>
                                <Link href={subItem.url}>
                                  <span>{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )
            }
            
            // Regular item without nested items
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild tooltip={item.title} isActive={isActive}>
                  <Link href={item.url}>
                    {item.icon && <item.icon data-theme-icon />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
