"use client"

import { useState } from "react"
import { toast } from "sonner"

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

const LOOKUP_LABELS: Record<LookupType, string> = {
  brand: "Brand",
  category: "Category",
  variant: "Variant",
}

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
  onCreate?: (value: string) => void
}) {
  const label = LOOKUP_LABELS[type]
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
          <SheetTitle className="text-lg leading-tight">Add {label}</SheetTitle>
          <SheetDescription>
            Create a new {label.toLowerCase()} and use it immediately.
          </SheetDescription>
        </SheetHeader>

        <form
          id={`lookup-${type}-form`}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5 text-sm"
          onSubmit={(e) => {
            e.preventDefault()
            const value = name.trim()
            if (!value) {
              toast.error(`${label} name is required.`)
              return
            }
            if (existingValues.some((v) => v.toLowerCase() === value.toLowerCase())) {
              toast.error(`${label} already exists.`)
              return
            }
            onCreate?.(value)
            toast.success(`${label} added`)
            closeAndReset()
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor={`lookup-${type}-name`}>{label} name</Label>
            <Input
              id={`lookup-${type}-name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`Enter ${label.toLowerCase()} name`}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`lookup-${type}-description`}>Description</Label>
            <Input
              id={`lookup-${type}-description`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={`Short description for ${label.toLowerCase()}`}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`lookup-${type}-status`}>Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as "active" | "inactive")}
            >
              <SelectTrigger id={`lookup-${type}-status`} className="w-full">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </form>

        <SheetFooter className="border-border/60 gap-2 border-t px-6 py-4 sm:flex-row sm:justify-end">
          <SheetClose asChild>
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </SheetClose>
          <Button type="submit" form={`lookup-${type}-form`}>
            Save {label}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
