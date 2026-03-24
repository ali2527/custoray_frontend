"use client"

import * as React from "react"
import { IconTableImport, IconLoader, IconTrash } from "@tabler/icons-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { downloadTextFile, parseCsv } from "@/lib/csv"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  sampleCsvContent: string
  sampleFilename?: string
  onComplete: (rows: Record<string, string>[]) => void
}

type CsvPreviewRow = {
  id: string
  cells: Record<string, string>
}

const STEPS = [
  { n: 1, title: "Sample file", short: "Sample" },
  { n: 2, title: "Upload CSV", short: "Upload" },
  { n: 3, title: "Review & import", short: "Review" },
] as const

export function DataTableImportDialog({
  open,
  onOpenChange,
  sampleCsvContent,
  sampleFilename = "sample.csv",
  onComplete,
}: Props) {
  const [step, setStep] = React.useState(1)
  const [uploadName, setUploadName] = React.useState("")
  const [previewRows, setPreviewRows] = React.useState<CsvPreviewRow[]>([])
  const [previewKeys, setPreviewKeys] = React.useState<string[]>([])
  const [selectedIds, setSelectedIds] = React.useState(() => new Set<string>())
  const [isReadingFile, setIsReadingFile] = React.useState(false)
  const [readPercent, setReadPercent] = React.useState<number | null>(null)
  const fileRef = React.useRef<HTMLInputElement>(null)
  const previewIdRef = React.useRef(0)

  const reset = React.useCallback(() => {
    setStep(1)
    setUploadName("")
    setPreviewRows([])
    setPreviewKeys([])
    setSelectedIds(new Set())
    setIsReadingFile(false)
    setReadPercent(null)
    if (fileRef.current) fileRef.current.value = ""
  }, [])

  React.useEffect(() => {
    if (!open) reset()
  }, [open, reset])

  const handleDownloadSample = () => {
    downloadTextFile(
      sampleFilename,
      sampleCsvContent,
      "text/csv;charset=utf-8"
    )
    toast.success("Sample CSV downloaded")
  }

  const handleFile = (file: File | undefined) => {
    if (!file) return
    setUploadName(file.name)
    setIsReadingFile(true)
    setReadPercent(null)
    const reader = new FileReader()
    reader.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) {
        setReadPercent(Math.min(100, Math.round((e.loaded / e.total) * 100)))
      }
    }
    reader.onload = () => {
      setIsReadingFile(false)
      setReadPercent(null)
      const text = String(reader.result ?? "")
      const rows = parseCsv(text)
      if (rows.length === 0) {
        toast.error("No data rows found in this CSV.")
        setPreviewRows([])
        setPreviewKeys([])
        setSelectedIds(new Set())
        return
      }
      const keys = Object.keys(rows[0])
      const withIds: CsvPreviewRow[] = rows.map((cells) => ({
        id: `import-${++previewIdRef.current}`,
        cells,
      }))
      setPreviewKeys(keys)
      setPreviewRows(withIds)
      setSelectedIds(new Set(withIds.map((r) => r.id)))
      toast.success(`Parsed ${rows.length} row(s)`)
    }
    reader.onerror = () => {
      setIsReadingFile(false)
      setReadPercent(null)
      toast.error("Could not read the file.")
    }
    reader.readAsText(file, "UTF-8")
  }

  const removeRow = (id: string) => {
    setPreviewRows((prev) => prev.filter((r) => r.id !== id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const toggleRowSelected = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const toggleSelectAllPreview = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(previewRows.map((r) => r.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const selectedCount = React.useMemo(() => {
    return previewRows.filter((r) => selectedIds.has(r.id)).length
  }, [previewRows, selectedIds])

  const allPreviewSelected =
    previewRows.length > 0 && selectedCount === previewRows.length
  const somePreviewSelected =
    selectedCount > 0 && selectedCount < previewRows.length

  const hasParsedRows = previewRows.length > 0
  const canFinish = step === 3 && selectedCount > 0

  const handleFinish = () => {
    const rows = previewRows
      .filter((r) => selectedIds.has(r.id))
      .map((r) => r.cells)
    onComplete(rows)
    onOpenChange(false)
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(dataTableDialogContentClassName, "gap-0")}>
        <DataTableDialogHeaderSection>
          <DialogTitle className="text-xl font-semibold tracking-tight sm:text-2xl">
            Import data
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-base leading-relaxed">
            Download the template, add your rows, upload the file, then review
            before merging into the table.
          </DialogDescription>

          <nav
            aria-label="Import steps"
            className="mt-6 grid w-full grid-cols-3 gap-3 sm:gap-6"
          >
            {STEPS.map((s) => {
              const done = step > s.n
              const active = step === s.n
              return (
                <div
                  key={s.n}
                  className="flex min-w-0 flex-col items-center gap-2 text-center"
                >
                  <span
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all",
                      done && "border-primary bg-primary text-primary-foreground",
                      active &&
                        "border-primary bg-primary/10 text-primary ring-4 ring-primary/20",
                      !done &&
                        !active &&
                        "border-muted-foreground/25 bg-muted/50 text-muted-foreground"
                    )}
                  >
                    {done ? "✓" : s.n}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-medium sm:text-sm",
                      active && "text-foreground",
                      !active && "text-muted-foreground"
                    )}
                  >
                    <span className="hidden sm:inline">{s.title}</span>
                    <span className="sm:hidden">{s.short}</span>
                  </span>
                </div>
              )
            })}
          </nav>
        </DataTableDialogHeaderSection>

        <DataTableDialogBody>
          {step === 1 && (
            <div className="bg-muted/40 space-y-5 rounded-xl border p-6 sm:p-8">
              <div className="space-y-2">
                <h3 className="text-foreground text-sm font-medium">
                  Step 1 — Get the template
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  The sample file lists every column your table expects, with one
                  example row. Fill more rows below that line in Excel or Google
                  Sheets, then continue.
                </p>
              </div>
              <Button type="button" size="lg" onClick={handleDownloadSample}>
                Download sample CSV
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <h3 className="text-foreground text-sm font-medium">
                  Step 2 — Upload your file
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Use UTF-8 encoding. Column headers must match the sample file
                  exactly.
                </p>
              </div>
              <label
                htmlFor="import-csv-input"
                className={cn(
                  "border-muted-foreground/25 hover:border-primary/40 hover:bg-muted/30 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 transition-colors",
                  isReadingFile && "pointer-events-none opacity-70"
                )}
              >
                <div className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-full">
                  <IconTableImport className="size-7" />
                </div>
                <div className="text-center">
                  <span className="text-foreground text-sm font-medium">
                    Click to choose a CSV file
                  </span>
                  <p className="text-muted-foreground mt-1 text-xs">
                    or drag and drop (browser: click only)
                  </p>
                </div>
                <input
                  id="import-csv-input"
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  disabled={isReadingFile}
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
              </label>
              {isReadingFile && (
                <div
                  className="bg-muted/40 space-y-2 rounded-xl border px-4 py-3"
                  role="status"
                  aria-live="polite"
                  aria-label="Reading uploaded file"
                >
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <IconLoader className="text-primary size-4 shrink-0 animate-spin" />
                    <span>
                      {readPercent != null
                        ? `Reading file… ${readPercent}%`
                        : "Reading file…"}
                    </span>
                  </div>
                  <div
                    className="bg-muted h-2 overflow-hidden rounded-full"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={readPercent ?? undefined}
                    aria-valuetext={
                      readPercent != null ? `${readPercent}%` : "Indeterminate"
                    }
                  >
                    <div
                      className={cn(
                        "bg-primary h-full rounded-full transition-[width] duration-150 ease-out",
                        readPercent == null && "animate-pulse"
                      )}
                      style={{
                        width:
                          readPercent != null ? `${readPercent}%` : "40%",
                      }}
                    />
                  </div>
                </div>
              )}
              {uploadName && !isReadingFile ? (
                <p className="text-muted-foreground text-center text-sm">
                  Selected:{" "}
                  <span className="text-foreground font-medium">{uploadName}</span>
                </p>
              ) : null}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-foreground text-sm font-medium">
                  Step 3 — Review rows
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Use the checkboxes to choose which rows to import (this only
                  affects the import — not row selection on the main table).
                  Remove a row with the trash icon if needed.
                </p>
              </div>
              <div className="max-h-[min(50vh,420px)] overflow-auto rounded-xl border bg-card shadow-inner">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/80 hover:bg-muted/80">
                      <TableHead className="bg-muted/80 sticky left-0 z-10 w-12">
                        <div className="flex items-center justify-center px-1">
                          <Checkbox
                            checked={
                              allPreviewSelected
                                ? true
                                : somePreviewSelected
                                  ? "indeterminate"
                                  : false
                            }
                            onCheckedChange={(v) =>
                              toggleSelectAllPreview(!!v)
                            }
                            aria-label="Select all preview rows for import"
                          />
                        </div>
                      </TableHead>
                      <TableHead className="bg-muted/80 sticky left-12 z-10 w-12 border-r border-border/60" />
                      {previewKeys.map((k) => (
                        <TableHead
                          key={k}
                          className="text-foreground whitespace-nowrap font-semibold"
                        >
                          {k}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={Math.max(1, previewKeys.length + 2)}
                          className="text-muted-foreground h-24 text-center text-sm"
                        >
                          No rows left. Go back to upload again.
                        </TableCell>
                      </TableRow>
                    ) : (
                      previewRows.map((row, idx) => (
                        <TableRow
                          key={row.id}
                          data-state={
                            selectedIds.has(row.id) ? "selected" : undefined
                          }
                          className="hover:bg-muted/40 data-[state=selected]:bg-muted/50"
                        >
                          <TableCell className="bg-background sticky left-0 z-10 p-1">
                            <div className="flex items-center justify-center px-1">
                              <Checkbox
                                checked={selectedIds.has(row.id)}
                                onCheckedChange={(v) =>
                                  toggleRowSelected(row.id, !!v)
                                }
                                aria-label={`Include row ${idx + 1} in import`}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="bg-background sticky left-12 z-10 border-r border-border/60 p-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive size-9"
                              aria-label={`Delete row ${idx + 1}`}
                              onClick={() => removeRow(row.id)}
                            >
                              <IconTrash className="size-4" />
                            </Button>
                          </TableCell>
                          {previewKeys.map((k) => (
                            <TableCell
                              key={k}
                              className="max-w-[min(180px,22vw)] truncate text-sm"
                              title={row.cells[k]}
                            >
                              {row.cells[k] ?? ""}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <p className="text-muted-foreground text-sm">
                <span className="text-foreground font-semibold tabular-nums">
                  {selectedCount}
                </span>{" "}
                of {previewRows.length} row
                {previewRows.length === 1 ? "" : "s"} selected for import.
              </p>
            </div>
          )}
        </DataTableDialogBody>

        <DataTableDialogFooterSection>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="sm:min-w-[7rem]"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <div className="flex flex-wrap justify-end gap-2">
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep((s) => Math.max(1, s - 1))}
                >
                  Back
                </Button>
              )}
              {step === 1 && (
                <Button type="button" size="lg" onClick={() => setStep(2)}>
                  Continue
                </Button>
              )}
              {step === 2 && (
                <Button
                  type="button"
                  size="lg"
                  disabled={!hasParsedRows}
                  onClick={() => setStep(3)}
                >
                  Continue to review
                </Button>
              )}
              {step === 3 && (
                <Button
                  type="button"
                  size="lg"
                  disabled={!canFinish}
                  onClick={handleFinish}
                >
                  Import {selectedCount} row
                  {selectedCount === 1 ? "" : "s"}
                </Button>
              )}
            </div>
          </div>
        </DataTableDialogFooterSection>
      </DialogContent>
    </Dialog>
  )
}
