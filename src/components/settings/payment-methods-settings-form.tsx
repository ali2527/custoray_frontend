"use client"

import { useState } from "react"
import { IconPlus, IconTrash } from "@tabler/icons-react"
import { toast } from "sonner"

import { SettingsSection } from "@/components/settings/settings-section"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { usePaymentMethods } from "@/hooks/use-payment-methods"

export function PaymentMethodsSettingsForm() {
  const { methods, add, remove } = usePaymentMethods()
  const [draft, setDraft] = useState("")

  const handleAdd = () => {
    const name = draft.trim()
    if (!name) {
      toast.error("Enter a payment method name.")
      return
    }
    if (methods.some((method) => method.toLowerCase() === name.toLowerCase())) {
      toast.error("That payment method already exists.")
      return
    }
    add(name)
    setDraft("")
    toast.success(`Added “${name}”.`)
  }

  return (
    <SettingsSection
      title="Payment methods"
      description="Methods available when recording sales and at the POS register. Enable which ones POS uses in POS settings."
    >
      <div className="flex flex-col gap-3">
        <ul className="border-border/60 divide-y rounded-lg border">
          {methods.map((method) => (
            <li
              key={method}
              className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
            >
              <span className="font-medium">{method}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive h-8 px-2"
                disabled={methods.length <= 1}
                onClick={() => {
                  remove(method)
                  toast.message(`Removed “${method}”.`)
                }}
              >
                <IconTrash className="size-4" />
                Remove
              </Button>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="e.g. JazzCash, Cheque, COD"
            maxLength={40}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                handleAdd()
              }
            }}
          />
          <Button type="button" onClick={handleAdd} className="sm:w-auto">
            <IconPlus className="size-4" />
            Add method
          </Button>
        </div>
      </div>
    </SettingsSection>
  )
}
