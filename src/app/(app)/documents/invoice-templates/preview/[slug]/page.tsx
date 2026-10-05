"use client"

import { use, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { IconArrowLeft, IconCheck, IconPencil } from "@tabler/icons-react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

import { InvoiceTemplatePreview } from "@/components/invoices/invoice-template-preview"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { confirmSelectInvoiceTemplateAction } from "@/lib/confirm-action"
import { loadCompanySettings } from "@/lib/company-settings"
import {
  invoiceTemplateIdSchema,
  loadActiveInvoiceTemplateRef,
  loadCustomInvoiceTemplates,
  resolveInvoiceTemplate,
  resolvePresetTemplate,
  saveActiveInvoiceTemplateRef,
  type ActiveInvoiceTemplateRef,
  type CustomInvoiceTemplate,
  type InvoiceTemplateId,
} from "@/lib/invoice-templates"
import { cn } from "@/lib/utils"
import i18n from "@/i18n"

type PreviewData =
  | {
      kind: "preset"
      id: InvoiceTemplateId
      name: string
      description: string
    }
  | {
      kind: "custom"
      template: CustomInvoiceTemplate
      name: string
      description: string
    }

function resolvePreviewData(slug: string): PreviewData | null {
  const preset = invoiceTemplateIdSchema.safeParse(slug)
  if (preset.success) {
    return {
      kind: "preset",
      id: preset.data,
      name: i18n.t(`presets.${preset.data}.name`, { ns: "documents" }),
      description: i18n.t(`presets.${preset.data}.description`, { ns: "documents" }),
    }
  }

  const custom = loadCustomInvoiceTemplates().find((t) => t.id === slug)
  if (custom) {
    return {
      kind: "custom",
      template: custom,
      name: custom.name,
      description: i18n.t("templatesPage.customBasedOn", {
        ns: "documents",
        name: i18n.t(`presets.${custom.baseLayout}.name`, { ns: "documents" }),
      }),
    }
  }

  return null
}

export default function InvoiceTemplatePreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)
  const { t } = useTranslation("documents")
  const { t: tc } = useTranslation("common")

  const [activeRef, setActiveRef] = useState<ActiveInvoiceTemplateRef>({ kind: "preset", id: "classic" })
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setActiveRef(loadActiveInvoiceTemplateRef())
    setHydrated(true)
  }, [])

  const preview = useMemo(() => (hydrated ? resolvePreviewData(slug) : null), [hydrated, slug])
  const company = loadCompanySettings()

  const isActive =
    preview?.kind === "preset"
      ? activeRef.kind === "preset" && activeRef.id === preview.id
      : preview?.kind === "custom"
        ? activeRef.kind === "custom" && activeRef.id === preview.template.id
        : false

  const handleSelect = async () => {
    if (!preview || isActive) return
    const confirmed = await confirmSelectInvoiceTemplateAction({ templateName: preview.name })
    if (!confirmed) return
    if (preview.kind === "preset") {
      const ref: ActiveInvoiceTemplateRef = { kind: "preset", id: preview.id }
      saveActiveInvoiceTemplateRef(ref)
      setActiveRef(ref)
      toast.success(t("toasts.activeNow", { name: preview.name }))
    } else {
      const ref: ActiveInvoiceTemplateRef = { kind: "custom", id: preview.template.id }
      saveActiveInvoiceTemplateRef(ref)
      setActiveRef(ref)
      toast.success(t("toasts.activeNow", { name: preview.name }))
    }
  }

  if (!hydrated) return null

  if (!preview) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-sm" style={{ color: "#6b7280" }}>
          {t("templatesPage.notFound")}
        </p>
        <Button type="button" variant="outline" asChild>
          <Link href="/documents/invoice-templates">
            <IconArrowLeft className="size-4" />
            {t("templatesPage.backToTemplates")}
          </Link>
        </Button>
      </div>
    )
  }

  const presetDefaults =
    preview.kind === "preset" ? resolvePresetTemplate(preview.id) : null

  const resolvedTemplate =
    preview.kind === "preset"
      ? resolveInvoiceTemplate(preview.id, presetDefaults!.colors)
      : resolveInvoiceTemplate(preview.template.baseLayout, preview.template.colors)

  const builder =
    preview.kind === "preset" ? presetDefaults!.builder : preview.template.builder
  const logoUrl =
    builder.logoUrlOverride.trim() || company.logoUrl.trim() || "/assets/logo-2.png"

  const customizeHref =
    preview.kind === "preset"
      ? `/documents/invoice-templates?customize=${preview.id}`
      : `/documents/invoice-templates?edit=${preview.template.id}`

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col" style={{ backgroundColor: "#f3f4f6" }}>
      <div
        className="sticky top-0 z-10 border-b px-4 py-3 lg:px-6"
        style={{ backgroundColor: "#ffffff", borderColor: "#e5e7eb" }}
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button type="button" variant="outline" size="sm" className="bg-white" asChild>
              <Link href="/documents/invoice-templates">
                <IconArrowLeft className="size-4" />
                {t("templatesPage.templates")}
              </Link>
            </Button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-base font-semibold" style={{ color: "#111827" }}>
                  {preview.name}
                </h1>
                {preview.kind === "custom" ? (
                  <Badge variant="outline" className="bg-white" style={{ color: "#374151" }}>
                    {t("templatesPage.custom")}
                  </Badge>
                ) : null}
                {isActive ? (
                  <Badge
                    variant="outline"
                    className="gap-1 border-[#92c720] bg-white"
                    style={{ color: "#3f6212" }}
                  >
                    <IconCheck className="size-3" />
                    {t("templatesPage.active")}
                  </Badge>
                ) : null}
              </div>
              <p className="truncate text-xs" style={{ color: "#6b7280" }}>
                {preview.description}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="bg-white" asChild>
              <Link href={customizeHref}>
                <IconPencil className="size-4" />
                {preview.kind === "preset" ? t("templatesPage.customize") : tc("actions.edit")}
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 lg:px-6">
        <div
          className={cn(
            "flex flex-col items-center",
            !isActive && "cursor-pointer"
          )}
          onClick={() => void handleSelect()}
          onKeyDown={(e) => {
            if (!isActive && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault()
              void handleSelect()
            }
          }}
          role={isActive ? undefined : "button"}
          tabIndex={isActive ? undefined : 0}
        >
          <div className="mb-4 text-center">
            <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "#9ca3af" }}>
              {t("templatesPage.portraitPreview")}
            </p>
            <p className="mt-1 text-sm" style={{ color: "#6b7280" }}>
              {isActive
                ? t("templatesPage.activeHint")
                : t("templatesPage.clickToSelect")}
            </p>
          </div>

          <div className="flex justify-center">
            <InvoiceTemplatePreview
              template={resolvedTemplate}
              builder={builder}
              logoUrl={logoUrl}
              size="full"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
