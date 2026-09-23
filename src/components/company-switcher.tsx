"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Building2, ChevronsUpDown, Plus, Settings } from "lucide-react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

import { useAuth } from "@/context/auth-context"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function CompanySwitcher() {
  const router = useRouter()
  const { isMobile, state } = useSidebar()
  const { t } = useTranslation("nav")
  const { t: tc } = useTranslation("common")
  const collapsed = state === "collapsed" && !isMobile
  const { companies, activeCompany, switchCompany, createCompany } = useAuth()
  const [createOpen, setCreateOpen] = React.useState(false)
  const [businessName, setBusinessName] = React.useState("")
  const [pending, setPending] = React.useState(false)

  if (!activeCompany) {
    return null
  }

  const handleSwitch = async (companyId: string) => {
    if (companyId === activeCompany.id) return
    try {
      setPending(true)
      await switchCompany(companyId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("companySwitcher.couldNotSwitch"))
      setPending(false)
    }
  }

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    const name = businessName.trim()
    if (!name) return

    try {
      setPending(true)
      await createCompany(name)
      setCreateOpen(false)
      setBusinessName("")
      toast.success(t("companySwitcher.created"))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("companySwitcher.couldNotCreate"))
    } finally {
      setPending(false)
    }
  }

  const logoUrl = activeCompany.logoUrl?.trim() || "/assets/logo-2.png"

  return (
    <>
      <SidebarMenu className={cn(collapsed && "items-center")}>
        <SidebarMenuItem className={cn(collapsed && "flex justify-center")}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className={cn(
                  "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
                  collapsed && "mx-auto justify-center"
                )}
                disabled={pending}
              >
                <span className="bg-sidebar-primary/10 flex aspect-square size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                  <img
                    src={logoUrl}
                    alt=""
                    className="size-full object-contain p-0.5"
                  />
                </span>
                <div
                  className={cn(
                    "grid flex-1 text-start text-sm leading-tight",
                    collapsed && "hidden"
                  )}
                >
                  <span className="truncate font-medium">{activeCompany.name}</span>
                  <span className="truncate text-xs">{activeCompany.plan}</span>
                </div>
                <ChevronsUpDown className={cn("ms-auto", collapsed && "hidden")} />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              align="start"
              side={isMobile ? "bottom" : "right"}
              sideOffset={4}
            >
              <DropdownMenuLabel className="text-muted-foreground text-xs">
                {t("companySwitcher.companies")}
              </DropdownMenuLabel>
              {companies.map((company, index) => (
                <DropdownMenuItem
                  key={company.id}
                  onClick={() => void handleSwitch(company.id)}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    <Building2 className="size-3.5 shrink-0" />
                  </div>
                  {company.name}
                  {index < 9 ? (
                    <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                  ) : null}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer gap-2 p-2"
                onSelect={() => router.push("/settings")}
              >
                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                  <Settings className="size-3.5 shrink-0" />
                </div>
                <div className="font-medium">{t("companySwitcher.settings")}</div>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 p-2"
                onSelect={() => {
                  setBusinessName("")
                  setCreateOpen(true)
                }}
              >
                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                  <Plus className="size-4" />
                </div>
                <div className="text-muted-foreground font-medium">{t("companySwitcher.add")}</div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>{t("companySwitcher.add")}</DialogTitle>
              <DialogDescription>
                {t("companySwitcher.addDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="new-company-name">{t("companySwitcher.name")}</Label>
              <Input
                id="new-company-name"
                className="mt-2"
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                placeholder="Acme Trading"
                autoFocus
                required
                minLength={2}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                {tc("actions.cancel")}
              </Button>
              <Button type="submit" disabled={pending || businessName.trim().length < 2}>
                {pending ? tc("actions.creating") : t("companySwitcher.create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
