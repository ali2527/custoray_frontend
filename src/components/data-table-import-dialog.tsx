"use client"

import * as React from "react"
import { IconCloudUpload, IconTrash } from "@tabler/icons-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { LoadingSpinner } from "@/components/ui/loading-spinner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { downloadTextFile, csvRecordFromLine, parseCsvLine, splitCsvLines, projectCsvRecord } from "@/lib/csv"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

export type ImportSelectColumns = Record<string, string[]>

const NONE_SELECT_VALUE = "__none__"

function lookupSelectOptions(
  key: string,
  columns?: ImportSelectColumns
): string[] | undefined {
  if (!columns) return undefined
  if (Object.prototype.hasOwnProperty.call(columns, key)) return columns[key]
  const lower = key.trim().toLowerCase()
  const match = Object.entries(columns).find(
    ([name]) => name.toLowerCase() === lower
  )
  return match?.[1]
}

function matchSelectOption(raw: string, options: string[]): string {
  const value = raw.trim()
  if (!value) return ""
  return (
    options.find(
      (option) => option.trim().toLowerCase() === value.toLowerCase()
    ) ?? ""
  )
}

function isRequiredSelectKey(key: string, requiredKeys?: string[]): boolean {
  if (!requiredKeys) return true
  const lower = key.trim().toLowerCase()
  return requiredKeys.some((name) => name.toLowerCase() === lower)
}

function isSelectIncomplete(
  key: string,
  raw: string,
  options: string[],
  requiredKeys?: string[]
): boolean {
  if (matchSelectOption(raw, options)) return false
  if (!isRequiredSelectKey(key, requiredKeys)) return Boolean(raw.trim())
  return true
}

function resolveSelectCells(
  cells: Record<string, string>,
  columns?: ImportSelectColumns
): Record<string, string> {
  if (!columns) return cells
  const next = { ...cells }
  for (const key of Object.keys(next)) {
    const options = lookupSelectOptions(key, columns)
    if (!options) continue
    next[key] = matchSelectOption(next[key] ?? "", options)
  }
  return next
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  sampleCsvContent: string
  sampleFilename?: string
  onComplete: (rows: Record<string, string>[]) => void
  /** Columns that should render as dropdowns of existing options. */
  selectColumns?: ImportSelectColumns
  /** Select columns that must have a matched value. Omitted = every select column. */
  requiredSelectColumns?: string[]
  /** When set, only these columns are kept from the uploaded file. */
  columns?: string[]
}

type CsvPreviewRow = {
  id: string
  cells: Record<string, string>
}

export function DataTableImportDialog({
  open,
  onOpenChange,
  sampleCsvContent,
  sampleFilename = "sample.csv",
  onComplete,
  selectColumns,
  requiredSelectColumns,
  columns,
}: Props) {
  const { t } = useTranslation()
  const [step, setStep] = React.useState(1)
  const [uploadName, setUploadName] = React.useState("")
  const [previewRows, setPreviewRows] = React.useState<CsvPreviewRow[]>([])
  const [previewKeys, setPreviewKeys] = React.useState<string[]>([])
  const [selectedIds, setSelectedIds] = React.useState(() => new Set<string>())
  const [isReadingFile, setIsReadingFile] = React.useState(false)
  const [readPercent, setReadPercent] = React.useState<number | null>(null)
  const [parseTotal, setParseTotal] = React.useState(0)
  const fileRef = React.useRef<HTMLInputElement>(null)
  const previewIdRef = React.useRef(0)
  const parseGenRef = React.useRef(0)
  const liveTableRef = React.useRef<HTMLDivElement>(null)

  const steps = [
    { n: 1, title: t("importDialog.stepSample"), short: t("importDialog.stepSampleShort") },
    { n: 2, title: t("importDialog.stepUpload"), short: t("importDialog.stepUploadShort") },
    { n: 3, title: t("importDialog.stepReview"), short: t("importDialog.stepReviewShort") },
  ]

  const reset = React.useCallback(() => {
    setStep(1)
    setUploadName("")
    setPreviewRows([])
    setPreviewKeys([])
    setSelectedIds(new Set())
    setIsReadingFile(false)
    setReadPercent(null)
    setParseTotal(0)
    parseGenRef.current += 1
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
    toast.success(t("importDialog.toastSampleDownloaded"))
  }

  const handleFile = (file: File | undefined) => {
    if (!file) return
    const gen = ++parseGenRef.current
    setUploadName(file.name)
    setIsReadingFile(true)
    setReadPercent(null)
    setParseTotal(0)
    setPreviewRows([])
    setPreviewKeys([])
    setSelectedIds(new Set())
    const reader = new FileReader()
    reader.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) {
        setReadPercent(Math.min(100, Math.round((e.loaded / e.total) * 100)))
      }
    }
    reader.onload = () => {
      void parseUploadedText(String(reader.result ?? ""), gen)
    }
    reader.onerror = () => {
      if (parseGenRef.current !== gen) return
      setIsReadingFile(false)
      setReadPercent(null)
      toast.error(t("importDialog.toastCouldNotRead"))
    }
    reader.readAsText(file, "UTF-8")
  }

  const parseUploadedText = async (text: string, gen: number) => {
    const lines = splitCsvLines(text)
    if (parseGenRef.current !== gen) return
    if (lines.length < 2) {
      setIsReadingFile(false)
      setReadPercent(null)
      toast.error(t("importDialog.toastNoDataRows"))
      setPreviewRows([])
      setPreviewKeys([])
      setSelectedIds(new Set())
      return
    }

    const headers = parseCsvLine(lines[0]).map((h) => h.trim())
    const total = lines.length - 1
    const previewHeaderKeys =
      columns && columns.length > 0 ? columns : headers
    setPreviewKeys(previewHeaderKeys)
    setParseTotal(total)
    setReadPercent(0)

    const parsed: CsvPreviewRow[] = []
    const selected = new Set<string>()

    for (let i = 1; i < lines.length; i++) {
      if (parseGenRef.current !== gen) return
      const rawCells = csvRecordFromLine(lines[i], headers)
      const row: CsvPreviewRow = {
        id: `import-${++previewIdRef.current}`,
        cells:
          columns && columns.length > 0
            ? projectCsvRecord(rawCells, columns)
            : rawCells,
      }
      parsed.push(row)
      selected.add(row.id)
      const parsedCount = parsed.length
      const batchSize = parsedCount < 50 ? 1 : 16
      const isLast = i === lines.length - 1
      if (parsedCount % batchSize === 0 || isLast) {
        setPreviewRows(parsed.slice())
        setSelectedIds(new Set(selected))
        setReadPercent(Math.round((parsedCount / total) * 100))
        const scroller = liveTableRef.current
        if (scroller) scroller.scrollTop = scroller.scrollHeight
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      }
    }

    if (parseGenRef.current !== gen) return
    setIsReadingFile(false)
    setReadPercent(100)
    toast.success(t("importDialog.toastParsed", { count: parsed.length }))
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

  const incompleteSelectedCount = React.useMemo(() => {
    if (!selectColumns) return 0
    return previewRows.filter((row) => {
      if (!selectedIds.has(row.id)) return false
      return previewKeys.some((key) => {
        const options = lookupSelectOptions(key, selectColumns)
        if (!options) return false
        return isSelectIncomplete(
          key,
          row.cells[key] ?? "",
          options,
          requiredSelectColumns
        )
      })
    }).length
  }, [previewKeys, previewRows, requiredSelectColumns, selectColumns, selectedIds])

  React.useEffect(() => {
    if (!isReadingFile) return
    const scroller = liveTableRef.current
    if (scroller) scroller.scrollTop = scroller.scrollHeight
  }, [previewRows, isReadingFile])

  const allPreviewSelected =
    previewRows.length > 0 && selectedCount === previewRows.length
  const somePreviewSelected =
    selectedCount > 0 && selectedCount < previewRows.length

  const hasParsedRows = previewRows.length > 0
  const hasUploadedFile = Boolean(uploadName) || isReadingFile
  const canFinish =
    step === 3 && selectedCount > 0 && incompleteSelectedCount === 0

  const updateCell = (id: string, key: string, value: string) => {
    setPreviewRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? { ...row, cells: { ...row.cells, [key]: value } }
          : row
      )
    )
  }

  const handleFinish = () => {
    if (incompleteSelectedCount > 0) {
      toast.error(t("importDialog.toastRequiredSelects"))
      return
    }
    const rows = previewRows
      .filter((r) => selectedIds.has(r.id))
      .map((r) => resolveSelectCells(r.cells, selectColumns))
    const incomplete = rows.filter((cells) =>
      previewKeys.some((key) => {
        const options = lookupSelectOptions(key, selectColumns)
        if (!options) return false
        return isSelectIncomplete(
          key,
          cells[key] ?? "",
          options,
          requiredSelectColumns
        )
      })
    )
    if (incomplete.length > 0) {
      toast.error(t("importDialog.toastRequiredSelects"))
      return
    }
    onComplete(rows)
    onOpenChange(false)
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(dataTableDialogContentClassName, "gap-0")}>
        <DataTableDialogHeaderSection>
          <DialogTitle className="text-xl font-semibold tracking-tight sm:text-2xl">
            {t("importDialog.title")}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-base leading-relaxed">
            {t("importDialog.description")}
          </DialogDescription>

          <nav
            aria-label={t("importDialog.stepsAria")}
            className="mt-6 grid w-full grid-cols-3 gap-3 sm:gap-6"
          >
            {steps.map((s) => {
              const done = step > s.n
              const active = step === s.n
              return (
                <div
                  key={s.n}
                  className="flex min-w-0 flex-col items-center gap-2 text-center"
                >
                  <span
                    dir="ltr"
                    className={cn(
                      "inline-grid size-11 shrink-0 place-items-center rounded-full border-2 p-0 text-center text-sm font-semibold leading-none tabular-nums transition-all",
                      done && "border-primary bg-primary text-primary-foreground",
                      active &&
                        "border-primary bg-primary/10 text-primary ring-4 ring-primary/20",
                      !done &&
                        !active &&
                        "border-muted-foreground/25 bg-muted/50 text-muted-foreground"
                    )}
                  >
                    <span className="leading-none">{done ? "✓" : s.n}</span>
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
                  {t("importDialog.step1Title")}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t("importDialog.step1Body")}
                </p>
              </div>
              <Button type="button" size="lg" onClick={handleDownloadSample}>
                {t("importDialog.downloadSample")}
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <h3 className="text-foreground text-sm font-medium">
                  {t("importDialog.step2Title")}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t("importDialog.step2Body")}
                </p>
              </div>
              {!hasUploadedFile ? (
              <label
                htmlFor="import-csv-input"
                className="border-muted-foreground/25 hover:border-primary/40 hover:bg-muted/30 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 transition-colors"
              >
                <div className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-full">
                  <IconCloudUpload className="size-7" />
                </div>
                <div className="text-center">
                  <span className="text-foreground text-sm font-medium">
                    {t("importDialog.chooseCsv")}
                  </span>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {t("importDialog.dragHint")}
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
              ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-muted-foreground text-sm">
                  {t("importDialog.selectedFile", { name: uploadName })}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isReadingFile}
                  onClick={() => fileRef.current?.click()}
                >
                  {t("importDialog.changeFile")}
                </Button>
                <input
                  id="import-csv-input"
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  disabled={isReadingFile}
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
              </div>
              )}
              {isReadingFile && (
                <div
                  className="bg-muted/40 space-y-2 rounded-xl border px-4 py-3"
                  role="status"
                  aria-live="polite"
                    aria-label={
                      parseTotal > 0
                        ? t("importDialog.parsingAria")
                        : t("importDialog.readingAria")
                    }
                >
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <LoadingSpinner size="sm" className="shrink-0" />
                    <span>
                      {parseTotal > 0
                        ? t("importDialog.parsingRows", {
                            parsed: previewRows.length,
                            total: parseTotal,
                          })
                        : readPercent != null
                          ? t("importDialog.readingFilePercent", { percent: readPercent })
                          : t("importDialog.readingFile")}
                    </span>
                  </div>
                  <div
                    className="bg-muted h-2 overflow-hidden rounded-full"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={readPercent ?? undefined}
                    aria-valuetext={
                      readPercent != null ? `${readPercent}%` : undefined
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
              {previewKeys.length > 0 ? (
                <div
                  ref={liveTableRef}
                  className="max-h-[min(36vh,320px)] overflow-auto rounded-xl border bg-card shadow-inner"
                >
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/80 hover:bg-muted/80">
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
                            colSpan={Math.max(1, previewKeys.length)}
                            className="text-muted-foreground h-16 text-center text-sm"
                          >
                            {t("importDialog.readingFile")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        previewRows.map((row) => (
                          <TableRow key={row.id}>
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
              ) : null}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-foreground text-sm font-medium">
                  {t("importDialog.step3Title")}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t("importDialog.step3Body")}
                </p>
              </div>
              <div className="max-h-[min(50vh,420px)] overflow-auto rounded-xl border bg-card shadow-inner [&_[data-slot=table-container]]:overflow-visible">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted hover:bg-muted">
                      <TableHead className="bg-muted sticky left-0 z-20 w-[4.75rem] min-w-[4.75rem] max-w-[4.75rem] border-r border-border px-1 pe-1">
                        <div className="bg-muted flex items-center justify-center rounded-md">
                          <Checkbox
                            className="bg-background dark:bg-background"
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
                            aria-label={t("importDialog.selectAllPreview")}
                          />
                        </div>
                      </TableHead>
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
                          colSpan={Math.max(1, previewKeys.length + 1)}
                          className="text-muted-foreground h-24 text-center text-sm"
                        >
                          {t("importDialog.noRowsLeft")}
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
                          <TableCell className="bg-background group-hover/row:bg-background group-data-[state=selected]/row:bg-background sticky left-0 z-20 w-[4.75rem] min-w-[4.75rem] max-w-[4.75rem] border-r border-border p-1">
                            <div className="bg-background flex items-center justify-center gap-0 rounded-md">
                              <Checkbox
                                className="bg-background dark:bg-background"
                                checked={selectedIds.has(row.id)}
                                onCheckedChange={(v) =>
                                  toggleRowSelected(row.id, !!v)
                                }
                                aria-label={t("importDialog.includeRow", { n: idx + 1 })}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="bg-background dark:bg-background text-destructive hover:bg-destructive/10 hover:text-destructive size-8 shrink-0"
                                aria-label={t("importDialog.deleteRow", { n: idx + 1 })}
                                onClick={() => removeRow(row.id)}
                              >
                                <IconTrash className="size-4" />
                              </Button>
                            </div>
                          </TableCell>
                          {previewKeys.map((k) => {
                            const options = lookupSelectOptions(k, selectColumns)
                            if (options) {
                              const raw = row.cells[k] ?? ""
                              const selected = matchSelectOption(raw, options)
                              const unmatched = raw.trim() && !selected ? raw.trim() : ""
                              const incomplete = isSelectIncomplete(
                                k,
                                raw,
                                options,
                                requiredSelectColumns
                              )
                              return (
                                <TableCell
                                  key={k}
                                  className="min-w-[10rem] p-1"
                                  title={
                                    unmatched
                                      ? t("importDialog.unmatchedValue", {
                                          value: unmatched,
                                        })
                                      : undefined
                                  }
                                >
                                  <Select
                                    value={selected || NONE_SELECT_VALUE}
                                    onValueChange={(value) =>
                                      updateCell(
                                        row.id,
                                        k,
                                        value === NONE_SELECT_VALUE ? "" : value
                                      )
                                    }
                                  >
                                    <SelectTrigger
                                      size="sm"
                                      className={cn(
                                        "h-8 w-full min-w-[9rem] max-w-[13rem]",
                                        incomplete && "border-destructive"
                                      )}
                                    >
                                      <SelectValue
                                        placeholder={t("importDialog.notSelected")}
                                      />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value={NONE_SELECT_VALUE}>
                                        {t("importDialog.notSelected")}
                                      </SelectItem>
                                      {options.map((option) => (
                                        <SelectItem key={option} value={option}>
                                          {option}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                              )
                            }
                            return (
                              <TableCell
                                key={k}
                                className="max-w-[min(180px,22vw)] truncate text-sm"
                                title={row.cells[k]}
                              >
                                {row.cells[k] ?? ""}
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <p className="text-muted-foreground text-sm">
                {t("importDialog.rowsSelected", {
                  selected: selectedCount,
                  total: previewRows.length,
                })}
              </p>
              {incompleteSelectedCount > 0 ? (
                <p className="text-destructive text-sm">
                  {t("importDialog.rowsNeedSelects", {
                    count: incompleteSelectedCount,
                  })}
                </p>
              ) : null}
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
              {t("actions.cancel")}
            </Button>
            <div className="flex flex-wrap justify-end gap-2">
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep((s) => Math.max(1, s - 1))}
                >
                  {t("actions.back")}
                </Button>
              )}
              {step === 1 && (
                <Button type="button" size="lg" onClick={() => setStep(2)}>
                  {t("actions.continue")}
                </Button>
              )}
              {step === 2 && (
                <Button
                  type="button"
                  size="lg"
                  disabled={!hasParsedRows || isReadingFile}
                  onClick={() => setStep(3)}
                >
                  {t("importDialog.continueToReview")}
                </Button>
              )}
              {step === 3 && (
                <Button
                  type="button"
                  size="lg"
                  disabled={!canFinish}
                  onClick={handleFinish}
                >
                  {t("importDialog.importRows", { count: selectedCount })}
                </Button>
              )}
            </div>
          </div>
        </DataTableDialogFooterSection>
      </DialogContent>
    </Dialog>
  )
}
