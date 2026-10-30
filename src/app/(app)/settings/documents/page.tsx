"use client"

import { DocumentDisplaySettingsForm } from "@/components/settings/document-display-settings-form"
import { DocumentNumberSettingsForm } from "@/components/settings/document-number-settings-form"
import { PaymentMethodsSettingsForm } from "@/components/settings/payment-methods-settings-form"

export default function DocumentsSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <DocumentNumberSettingsForm />
      <PaymentMethodsSettingsForm />
      <DocumentDisplaySettingsForm />
    </div>
  )
}
