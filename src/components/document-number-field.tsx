"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { DocumentNumberEntry } from "@/lib/document-number-settings"

type DocumentNumberFieldProps = {
  id: string
  name: string
  label: string
  value: string
  settings: DocumentNumberEntry
  isNew: boolean
  placeholder?: string
  autoHint?: string
}

export function DocumentNumberField({
  id,
  name,
  label,
  value,
  settings,
  isNew,
  placeholder,
  autoHint,
}: DocumentNumberFieldProps) {
  if (settings.mode === "auto" && isNew) {
    return (
      <div className="flex flex-col gap-2">
        <Label>{label}</Label>
        <p className="text-muted-foreground bg-muted/50 rounded-md border px-3 py-2 text-sm">
          {autoHint ?? placeholder ?? "Auto"}
        </p>
        <input type="hidden" name={name} value="" />
      </div>
    )
  }

  if (settings.mode === "auto" && !isNew) {
    return (
      <div className="flex flex-col gap-2">
        <Label>{label}</Label>
        <p className="text-muted-foreground bg-muted/50 rounded-md border px-3 py-2 font-mono text-sm">
          {value || "—"}
        </p>
        <input type="hidden" name={name} value={value} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        defaultValue={value}
        placeholder={placeholder}
        required={isNew}
        autoComplete="off"
      />
    </div>
  )
}
