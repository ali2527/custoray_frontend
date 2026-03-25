"use client"

import * as React from "react"
import { CloudDownload, FileJson, FileSpreadsheet, FileText } from "lucide-react"
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

const FORMATS: {
  id: ExportFormatId
  title: string
  description: string
  extension: string
  mime: string
  Icon: LucideIcon
}[] = [
  {
    id: "csv",
    title: "CSV",
    description: "Comma-separated text — universal, lightweight",
    extension: "csv",
    mime: "text/csv;charset=utf-8",
    Icon: FileText,
  },
  {
    id: "xls",
    title: "Excel (XLS)",
    description: "Microsoft Excel 97–2004 workbook (.xls)",
    extension: "xls",
    mime: "application/vnd.ms-excel",
    Icon: FileSpreadsheet,
  },
  {
    id: "json",
    title: "JSON",
    description: "Structured data for APIs and developers",
    extension: "json",
    mime: "application/json;charset=utf-8",
    Icon: FileJson,
  },
]

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  rowCount: number
  getRows: () => Record<string, unknown>[]
  filename?: string
}

export function DataTableExportDialog({
  open,
  onOpenChange,
  rowCount,
  getRows,
  filename = "export.csv",
}: Props) {
  const [format, setFormat] = React.useState<ExportFormatId>("csv")
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (open) setFormat("csv")
  }, [open])

  const handleDownload = async () => {
    const rows = getRows()
    if (rows.length === 0) {
      toast.error("Nothing to export.")
      return
    }
    const meta = FORMATS.find((f) => f.id === format)!
    const base = exportFilenameBase(filename)
    const outName = `${base}.${meta.extension}`

    try {
      setBusy(true)
      if (format === "csv") {
        downloadTextFile(outName, rowsToCsv(rows), meta.mime)
      } else if (format === "json") {
        downloadTextFile(outName, rowsToJson(rows), meta.mime)
      } else {
        const { downloadRowsAsXls } = await import("@/lib/excel-export")
        downloadRowsAsXls(rows, outName)
      }
      toast.success(`Downloaded ${rows.length} row(s) as ${meta.title}`)
      onOpenChange(false)
    } catch {
      toast.error("Could not build the file. Try another format.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(dataTableDialogContentClassName, "gap-0")}>
        <DataTableDialogHeaderSection>
          <DialogTitle className="text-xl font-semibold tracking-tight sm:text-2xl">
            Export data
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-base leading-relaxed">
            Choose a file type, then download. Only rows that match your current
            search and filters are included.
          </DialogDescription>
          <div className="bg-primary/10 text-primary mt-4 inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 px-4 py-2 text-sm font-medium">
            <CloudDownload className="size-4 shrink-0" aria-hidden />
            <span className="tabular-nums">{rowCount}</span>
            <span className="text-primary/90 font-normal">
              row{rowCount === 1 ? "" : "s"} ready to export
            </span>
          </div>
        </DataTableDialogHeaderSection>

        <DataTableDialogBody>
          <div className="space-y-3">
            <h3 className="text-foreground text-sm font-medium">
              Download format
            </h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {FORMATS.map((f) => {
                const selected = format === f.id
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFormat(f.id)}
                    className={cn(
                      "flex flex-col items-start gap-3 rounded-xl border-2 p-5 text-left transition-all outline-none",
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
              Cancel
            </Button>
            <Button
              type="button"
              size="lg"
              onClick={() => void handleDownload()}
              disabled={rowCount === 0 || busy}
            >
              {busy ? "Preparing…" : "Download "}
              {!busy && (FORMATS.find((x) => x.id === format)?.title ?? "file")}
            </Button>
          </div>
        </DataTableDialogFooterSection>
      </DialogContent>
    </Dialog>
  )
}
