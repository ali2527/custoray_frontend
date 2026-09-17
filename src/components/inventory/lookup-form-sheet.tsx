"use client"

import { useState } from "react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export type LookupType = "brand" | "category" | "variant"

export function LookupFormSheet({
  open,
  onOpenChange,
  type,
  existingValues,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: LookupType
  existingValues: string[]
  onCreate?: (
    value: string,
    meta?: { description?: string; status?: string }
  ) => void | Promise<void>
}) {
  const { t } = useTranslation("inventory")
  const label = t(`columns.${type}`)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState<"active" | "inactive">("active")

  const closeAndReset = () => {
    onOpenChange(false)
    setName("")
    setDescription("")
    setStatus("active")
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-sm"
      >
        <SheetHeader className="border-border/60 space-y-1 border-b px-6 py-5 text-left">
          <SheetTitle className="text-lg leading-tight">
            {t("lookup.add", { label })}
          </SheetTitle>
          <SheetDescription>
            {t("lookup.addDescription", { label })}
          </SheetDescription>
        </SheetHeader>

        <form
          id={`lookup-${type}-form`}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5 text-sm"
          onSubmit={async (e) => {
            e.preventDefault()
            const value = name.trim()
            if (!value) {
              toast.error(t("lookup.nameRequired", { label }))
              return
            }
            if (existingValues.some((v) => v.toLowerCase() === value.toLowerCase())) {
              toast.error(t("lookup.alreadyExists", { label }))
              return
            }
            try {
              await onCreate?.(value, {
                description: description.trim() || undefined,
                status,
              })
              toast.success(t("lookup.added", { label }))
              closeAndReset()
            } catch (error) {
              toast.error(
                error instanceof Error ? error.message : t("lookup.alreadyExists", { label })
              )
            }
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor={`lookup-${type}-name`}>
              {t("lookup.nameLabel", { label })}
            </Label>
            <Input
              id={`lookup-${type}-name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("lookup.namePlaceholder", { label })}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`lookup-${type}-description`}>
              {t("fields.description")}
            </Label>
            <Input
              id={`lookup-${type}-description`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("lookup.descriptionPlaceholder", { label })}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`lookup-${type}-status`}>{t("fields.status")}</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as "active" | "inactive")}
            >
              <SelectTrigger id={`lookup-${type}-status`} className="w-full">
                <SelectValue placeholder={t("fields.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t("tabs.active")}</SelectItem>
                <SelectItem value="inactive">{t("tabs.inactive")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </form>

        <SheetFooter className="border-border/60 gap-2 border-t px-6 py-4 sm:flex-row sm:justify-end">
          <SheetClose asChild>
            <Button variant="outline" type="button">
              {t("actions.cancel", { ns: "common" })}
            </Button>
          </SheetClose>
          <Button type="submit" form={`lookup-${type}-form`}>
            {t("lookup.save", { label })}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
