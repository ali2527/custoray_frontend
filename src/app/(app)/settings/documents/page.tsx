"use client"

import { DocumentDisplaySettingsForm } from "@/components/settings/document-display-settings-form"
import { DocumentNumberSettingsForm } from "@/components/settings/document-number-settings-form"

export default function DocumentsSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <DocumentNumberSettingsForm />
      <DocumentDisplaySettingsForm />
    </div>
  )
}
