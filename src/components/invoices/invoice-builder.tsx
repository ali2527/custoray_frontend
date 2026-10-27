"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { IconDeviceFloppy, IconPhoto, IconRotate } from "@tabler/icons-react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

import { InvoiceTemplatePreview } from "@/components/invoices/invoice-template-preview"
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
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { loadCompanySettings } from "@/lib/company-settings"
import {
  createCustomInvoiceTemplate,
  defaultInvoiceBuilderConfig,
  getDefaultColorsForTemplate,
  INVOICE_COLOR_FIELDS,
  INVOICE_MERGE_FIELDS,
  INVOICE_TEMPLATES,
  resolveInvoiceTemplate,
  type CustomInvoiceTemplate,
  type InvoiceBuilderConfig,
  type InvoiceBuilderLabels,
  type InvoiceFieldId,
  type InvoiceTemplateColorOverrides,
  type InvoiceTemplateId,
} from "@/lib/invoice-templates"

type InvoiceBuilderProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  baseLayout: InvoiceTemplateId
  colors: InvoiceTemplateColorOverrides
  builder: InvoiceBuilderConfig
  onBaseLayoutChange: (id: InvoiceTemplateId) => void
  onColorsChange: (colors: InvoiceTemplateColorOverrides) => void
  onBuilderChange: (builder: InvoiceBuilderConfig) => void
  onSaveCustomTemplate: (template: CustomInvoiceTemplate) => void
  editingCustom?: CustomInvoiceTemplate | null
  suggestedTemplateName?: string
}

const LABEL_FIELDS: (keyof InvoiceBuilderLabels)[] = [
  "documentTitle",
  "billToLabel",
  "dateLabel",
  "invoiceIdLabel",
  "statusLabel",
  "rowNumberColumn",
  "descriptionColumn",
  "qtyColumn",
  "rateColumn",
  "amountColumn",
  "subtotalLabel",
  "paidLabel",
  "balanceLabel",
  "totalLabel",
  "thankYouMessage",
  "footerNote",
]

const FIELD_GROUPS = [
  "company",
  "invoice",
  "customer",
  "items",
  "totals",
  "footer",
] as const

function readLogoFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.onerror = () => reject(new Error("Could not read logo file."))
    reader.readAsDataURL(file)
  })
}

export function InvoiceBuilder({
  open,
  onOpenChange,
  baseLayout,
  colors,
  builder,
  onBaseLayoutChange,
  onColorsChange,
  onBuilderChange,
  onSaveCustomTemplate,
  editingCustom,
  suggestedTemplateName = "",
}: InvoiceBuilderProps) {
  const { t } = useTranslation("documents")
  const [templateName, setTemplateName] = useState(suggestedTemplateName)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const company = useMemo(() => loadCompanySettings(), [open])

  useEffect(() => {
    if (open) {
      setTemplateName(editingCustom?.name ?? suggestedTemplateName)
    }
  }, [open, editingCustom, suggestedTemplateName])

  const resolvedTemplate = resolveInvoiceTemplate(baseLayout, colors)
  const logoUrl =
    builder.logoUrlOverride.trim() ||
    company.logoUrl.trim() ||
    "/assets/logo-2.png"

  const patchBuilder = useCallback(
    (patch: Partial<InvoiceBuilderConfig>) => {
      onBuilderChange({ ...builder, ...patch })
    },
    [builder, onBuilderChange]
  )

  const patchLabel = useCallback(
    (key: keyof InvoiceBuilderLabels, value: string) => {
      onBuilderChange({
        ...builder,
        labels: { ...builder.labels, [key]: value },
      })
    },
    [builder, onBuilderChange]
  )

  const toggleField = useCallback(
    (id: InvoiceFieldId, enabled: boolean) => {
      onBuilderChange({
        ...builder,
        fields: { ...builder.fields, [id]: enabled },
      })
    },
    [builder, onBuilderChange]
  )

  const handleLogoUpload = async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error(t("builder.chooseImage"))
      return
    }
    try {
      const dataUrl = await readLogoFile(file)
      patchBuilder({ logoUrlOverride: dataUrl })
      toast.success(t("builder.logoUpdated"))
    } catch {
      toast.error(t("builder.logoFailed"))
    }
  }

  const handleResetBuilder = () => {
    onBuilderChange(defaultInvoiceBuilderConfig())
    toast.message(t("builder.resetBuilder"))
  }

  const handleResetColors = () => {
    onColorsChange(getDefaultColorsForTemplate(baseLayout))
    toast.message(t("builder.resetColorsToast"))
  }

  const handleSaveCustom = () => {
    const name = templateName.trim()
    if (!name) {
      toast.error(t("builder.enterName"))
      return
    }
    const template = editingCustom
      ? { ...editingCustom, name, baseLayout, colors, builder }
      : createCustomInvoiceTemplate(name, baseLayout, colors, builder)
    onSaveCustomTemplate(template)
    toast.success(editingCustom ? t("builder.customUpdated") : t("builder.customSaved"))
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(100vw,1100px)]"
        style={{ backgroundColor: "#f9fafb" }}
      >
        <SheetHeader className="shrink-0 border-b px-6 py-4" style={{ borderColor: "#e5e7eb", backgroundColor: "#ffffff" }}>
          <SheetTitle style={{ color: "#111827" }}>
            {editingCustom ? t("builder.editTitle") : t("builder.createTitle")}
          </SheetTitle>
          <SheetDescription style={{ color: "#6b7280" }}>
            {editingCustom ? t("builder.editHint") : t("builder.createHint")}
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="min-h-0 flex-1 overflow-y-auto border-r p-4 lg:p-6" style={{ borderColor: "#e5e7eb", backgroundColor: "#ffffff" }}>
            <Tabs defaultValue="fields" className="flex flex-col gap-4">
              <TabsList className="grid w-full grid-cols-4 bg-[#f3f4f6]">
                <TabsTrigger value="fields">{t("builder.tabFields")}</TabsTrigger>
                <TabsTrigger value="text">{t("builder.tabText")}</TabsTrigger>
                <TabsTrigger value="company">{t("builder.tabCompany")}</TabsTrigger>
                <TabsTrigger value="colors">{t("builder.tabColors")}</TabsTrigger>
              </TabsList>

              <TabsContent value="fields" className="mt-0 space-y-4">
                <p className="text-xs" style={{ color: "#6b7280" }}>
                  {t("builder.fieldsHint")}
                </p>
                {FIELD_GROUPS.map((groupId) => {
                  const items = INVOICE_MERGE_FIELDS.filter((f) => f.group === groupId)
                  return (
                    <div key={groupId} className="rounded-lg border p-3" style={{ borderColor: "#e5e7eb" }}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "#374151" }}>
                        {t(`builder.groups.${groupId}`)}
                      </p>
                      <div className="flex flex-col gap-2">
                        {items.map((field) => (
                          <div key={field.id} className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium" style={{ color: "#111827" }}>
                                {t(`mergeFields.${field.id}`)}
                              </p>
                              <p className="font-mono text-[10px]" style={{ color: "#9ca3af" }}>
                                {field.hint}
                              </p>
                            </div>
                            <Switch
                              checked={builder.fields[field.id]}
                              onCheckedChange={(checked) => toggleField(field.id, checked)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </TabsContent>

              <TabsContent value="text" className="mt-0 space-y-3">
                {LABEL_FIELDS.map((key) => (
                  <div key={key} className="flex flex-col gap-1.5">
                    <Label htmlFor={`builder-label-${key}`} className="text-xs" style={{ color: "#374151" }}>
                      {t(`builder.labelFields.${key}`)}
                    </Label>
                    <Input
                      id={`builder-label-${key}`}
                      value={builder.labels[key]}
                      onChange={(e) => patchLabel(key, e.target.value)}
                      className="bg-white"
                    />
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" className="bg-white" onClick={handleResetBuilder}>
                  <IconRotate className="size-4" />
                  {t("builder.resetText")}
                </Button>
              </TabsContent>

              <TabsContent value="company" className="mt-0 space-y-4">
                <p className="text-xs" style={{ color: "#6b7280" }}>
                  {t("builder.companyHint")}{" "}
                  <Link
                    href="/settings"
                    className="text-primary font-medium underline underline-offset-2"
                    onClick={() => onOpenChange(false)}
                  >
                    {t("builder.openCompanySettings")}
                  </Link>
                </p>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs" style={{ color: "#374151" }}>{t("builder.companyName")}</Label>
                  <Input
                    placeholder={company.name || "{{company_name}}"}
                    value={builder.companyNameOverride}
                    onChange={(e) => patchBuilder({ companyNameOverride: e.target.value })}
                    className="bg-white"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs" style={{ color: "#374151" }}>{t("builder.tagline")}</Label>
                  <Input
                    placeholder="{{company_tagline}}"
                    value={builder.companyTaglineOverride}
                    onChange={(e) => patchBuilder({ companyTaglineOverride: e.target.value })}
                    className="bg-white"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs" style={{ color: "#374151" }}>{t("builder.address")}</Label>
                  <Input
                    placeholder="{{company_address}}"
                    value={builder.companyAddressOverride}
                    onChange={(e) => patchBuilder({ companyAddressOverride: e.target.value })}
                    className="bg-white"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs" style={{ color: "#374151" }}>{t("builder.phoneEmail")}</Label>
                  <Input
                    placeholder="{{company_contact}}"
                    value={builder.companyContactOverride}
                    onChange={(e) => patchBuilder({ companyContactOverride: e.target.value })}
                    className="bg-white"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-xs" style={{ color: "#374151" }}>{t("builder.logo")}</Label>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => void handleLogoUpload(e.target.files?.[0])}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="bg-white"
                      onClick={() => logoInputRef.current?.click()}
                    >
                      <IconPhoto className="size-4" />
                      {t("builder.uploadLogo")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="bg-white"
                      onClick={() => patchBuilder({ logoUrlOverride: "" })}
                    >
                      {t("builder.useCompanyLogo")}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="colors" className="mt-0 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs" style={{ color: "#374151" }}>{t("builder.baseLayout")}</Label>
                  <Select value={baseLayout} onValueChange={(v) => onBaseLayoutChange(v as InvoiceTemplateId)}>
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INVOICE_TEMPLATES.map((layout) => (
                        <SelectItem key={layout.id} value={layout.id}>
                          {t(`presets.${layout.id}.name`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#374151" }}>
                    {t("builder.templateColors")}
                  </p>
                  <Button type="button" variant="outline" size="sm" className="bg-white" onClick={handleResetColors}>
                    {t("builder.resetColors")}
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {INVOICE_COLOR_FIELDS.map(({ key }) => {
                    const value = colors[key] ?? getDefaultColorsForTemplate(baseLayout)[key] ?? "#000000"
                    const colorLabel = t(`colors.${key}`)
                    return (
                      <div
                        key={key}
                        className="flex items-center gap-2 rounded-md border bg-white p-2"
                        style={{ borderColor: "#e5e7eb" }}
                      >
                        <input
                          type="color"
                          value={value}
                          onChange={(e) => onColorsChange({ ...colors, [key]: e.target.value })}
                          className="size-8 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
                          aria-label={colorLabel}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11px] font-medium" style={{ color: "#111827" }}>
                            {colorLabel}
                          </p>
                          <p className="font-mono text-[10px] uppercase" style={{ color: "#6b7280" }}>
                            {value}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </TabsContent>
            </Tabs>

            <div className="mt-6 space-y-3 border-t pt-4" style={{ borderColor: "#e5e7eb" }}>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="custom-template-name" className="text-xs" style={{ color: "#374151" }}>
                  {t("builder.templateName")}
                </Label>
                <Input
                  id="custom-template-name"
                  placeholder={t("builder.namePlaceholder")}
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="bg-white"
                />
              </div>
              <Button type="button" className="w-full sm:w-auto" onClick={handleSaveCustom}>
                <IconDeviceFloppy className="size-4" />
                {editingCustom ? t("builder.saveChanges") : t("builder.saveCustom")}
              </Button>
            </div>
          </div>

          <div
            className="flex shrink-0 flex-col items-center justify-start gap-3 overflow-y-auto p-4 lg:w-[360px] lg:p-6"
            style={{ backgroundColor: "#f3f4f6" }}
          >
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#374151" }}>
              {t("builder.livePreview")}
            </p>
            <InvoiceTemplatePreview
              template={resolvedTemplate}
              builder={builder}
              logoUrl={logoUrl}
              size="sheet"
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
