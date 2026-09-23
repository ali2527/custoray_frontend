"use client"

import * as React from "react"
import { CloudDownload, FileJson, FileSpreadsheet, FileText } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  dataTableDialogContentClassName,
  DataTableDialogBody,
  DataTableDialogFooterSection,
  DataTableDialogHeaderSection,
} from "@/components/data-table-dialog-layout"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  downloadTextFile,
  exportFilenameBase,
  rowsToCsv,
  rowsToJson,
} from "@/lib/csv"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

export type ExportFormatId = "csv" | "xls" | "json"

export type ExportCustomFormat = {
  id: string
  title: string
  description: string
  actionLabel?: string
  Icon: LucideIcon
}

const FORMAT_META: {
  id: ExportFormatId
  extension: string
  mime: string
  Icon: LucideIcon
}[] = [
  {
    id: "csv",
    extension: "csv",
    mime: "text/csv;charset=utf-8",
    Icon: FileText,
  },
  {
    id: "xls",
    extension: "xls",
    mime: "application/vnd.ms-excel",
    Icon: FileSpreadsheet,
  },
  {
    id: "json",
    extension: "json",
    mime: "application/json;charset=utf-8",
    Icon: FileJson,
  },
]

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  rowCount: number
  getRows?: () => Record<string, unknown>[]
  filename?: string
  extra?: React.ReactNode
  title?: string
  description?: string
  defaultFormat?: string
  builtInFormats?: ExportFormatId[]
  customFormats?: ExportCustomFormat[]
  onCustomDownload?: (id: string) => void | Promise<void>
}

export function DataTableExportDialog({
  open,
  onOpenChange,
  rowCount,
  getRows,
  filename = "export.csv",
  extra,
  title,
  description,
  defaultFormat,
  builtInFormats,
  customFormats = [],
  onCustomDownload,
}: Props) {
  const { t } = useTranslation()
  const [format, setFormat] = React.useState<string>(defaultFormat ?? "csv")
  const [busy, setBusy] = React.useState(false)
  const allowedBuiltIns = builtInFormats ?? FORMAT_META.map((meta) => meta.id)

  const fileFormats = FORMAT_META.filter((meta) =>
    allowedBuiltIns.includes(meta.id)
  ).map((meta) => ({
    ...meta,
    title: t(`exportDialog.${meta.id}`),
    description: t(`exportDialog.${meta.id}Desc`),
    actionLabel: t("exportDialog.download", {
      format: t(`exportDialog.${meta.id}`),
    }),
  }))
  const formats = [...fileFormats, ...customFormats]

  React.useEffect(() => {
    if (open) setFormat(defaultFormat ?? "csv")
  }, [open, defaultFormat])

  const handleDownload = async () => {
    if (rowCount === 0) {
      toast.error(t("exportDialog.toastNothing"))
      return
    }
    const custom = customFormats.find((item) => item.id === format)
    if (custom) {
      try {
        setBusy(true)
        await onCustomDownload?.(custom.id)
        onOpenChange(false)
      } catch {
        toast.error(t("exportDialog.toastFailed"))
      } finally {
        setBusy(false)
      }
      return
    }
    const rows = getRows?.() ?? []
    if (rows.length === 0) {
      toast.error(t("exportDialog.toastNothing"))
      return
    }
    const fileFormat = format as ExportFormatId
    const meta = FORMAT_META.find((f) => f.id === fileFormat)
    if (!meta) return
    const formatTitle = t(`exportDialog.${fileFormat}`)
    const base = exportFilenameBase(filename)
    const outName = `${base}.${meta.extension}`

    try {
      setBusy(true)
      if (fileFormat === "csv") {
        downloadTextFile(outName, rowsToCsv(rows), meta.mime)
      } else if (fileFormat === "json") {
        downloadTextFile(outName, rowsToJson(rows), meta.mime)
      } else {
        const { downloadRowsAsXls } = await import("@/lib/excel-export")
        downloadRowsAsXls(rows, outName)
      }
      toast.success(
        t("exportDialog.toastDownloaded", { count: rows.length, format: formatTitle })
      )
      onOpenChange(false)
    } catch {
      toast.error(t("exportDialog.toastFailed"))
    } finally {
      setBusy(false)
    }
  }

  const selected = formats.find((item) => item.id === format)
  const selectedTitle =
    selected && "actionLabel" in selected && selected.actionLabel
      ? selected.actionLabel
      : t("exportDialog.download", { format: t(`exportDialog.${format}`) })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(dataTableDialogContentClassName, "gap-0")}>
        <DataTableDialogHeaderSection>
          <DialogTitle className="text-xl font-semibold tracking-tight sm:text-2xl">
            {title ?? t("exportDialog.title")}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-base leading-relaxed">
            {description ?? t("exportDialog.description")}
          </DialogDescription>
          <div className="bg-primary/10 text-primary mt-4 inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 px-4 py-2 text-sm font-medium">
            <CloudDownload className="size-4 shrink-0" aria-hidden />
            <span className="tabular-nums font-medium">
              {t("exportDialog.rowsReady", { count: rowCount })}
            </span>
          </div>
        </DataTableDialogHeaderSection>

        <DataTableDialogBody>
          {extra ? <div className="mb-6">{extra}</div> : null}
          <div className="space-y-3">
            <h3 className="text-foreground text-sm font-medium">
              {t("exportDialog.downloadFormat")}
            </h3>
            <div
              className={cn(
                "grid gap-3",
                formats.length > 3 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"
              )}
            >
              {formats.map((f) => {
                const selected = format === f.id
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFormat(f.id)}
                    className={cn(
                      "flex flex-col items-start gap-3 rounded-xl border-2 p-5 text-start transition-all outline-none",
                      "hover:border-primary/40 hover:bg-muted/40",
                      "focus-visible:ring-ring focus-visible:ring-[3px]",
                      selected
                        ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                        : "border-muted bg-card"
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-11 items-center justify-center rounded-lg",
                        selected ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}
                    >
                      <f.Icon className="size-5" strokeWidth={1.75} />
                    </div>
                    <div>
                      <p className="text-foreground font-semibold">{f.title}</p>
                      <p className="text-muted-foreground mt-1 text-xs leading-snug">
                        {f.description}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </DataTableDialogBody>

        <DataTableDialogFooterSection>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="sm:min-w-[7rem]"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              {t("actions.cancel")}
            </Button>
            <Button
              type="button"
              size="lg"
              onClick={() => void handleDownload()}
              disabled={rowCount === 0 || busy}
            >
              {busy
                ? t("exportDialog.preparing")
                : selectedTitle}
            </Button>
          </div>
        </DataTableDialogFooterSection>
      </DialogContent>
    </Dialog>
  )
}
