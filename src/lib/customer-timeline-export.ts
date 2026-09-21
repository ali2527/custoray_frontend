import { formatMoney, parseMoney, type CustomerRow } from "@/lib/customers"
import {
  formatTimelineMonthLabel,
  groupTimelineByMonth,
  summarizeTimeline,
  timelineMonthKey,
  type CustomerTimelineRow,
} from "@/lib/customer-timeline"
import type { CompanySettings } from "@/lib/company-settings"
import {
  timelineReportEntries,
  type TimelineReportEntry,
  type TimelineReportLabels,
} from "@/lib/customer-timeline-report"
import { downloadBlob, rowsToCsv, rowsToJson } from "@/lib/csv"

export type TimelineExportLabels = TimelineReportLabels & {
  month: string
  items: string
  monthsHeading: string
  ledger: string
}

export type TimelineExportRecord = Record<string, string | number>

function moneyNumber(value: string): number {
  return Number(parseMoney(value))
}

export function formatTimelineExportDate(value: string, locale: string): string {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}

function compactItems(entry: TimelineReportEntry): string {
  return entry.lines
    .map(
      (line) =>
        `${line.name} × ${line.quantity} @ ${formatMoney(line.unitPrice)}`
    )
    .join("; ")
}

export function timelineStatementFilename(
  customerName: string,
  periodSlug: string
): string {
  const base =
    customerName
      .trim()
      .replace(/[\\/:*?"<>|]+/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "customer"
  const slug = periodSlug.replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, "-")
  return slug ? `${base}-statement-${slug}` : `${base}-statement`
}

export function timelineExportLabeledRows(
  rows: CustomerTimelineRow[],
  labels: TimelineExportLabels,
  locale: string
): TimelineExportRecord[] {
  return timelineReportEntries(rows).map((entry) => {
    const isReturn = entry.kind === "return"
    return {
      [labels.date]: formatTimelineExportDate(entry.date, locale),
      [labels.type]: isReturn ? labels.returnLabel : labels.invoice,
      [labels.document]: entry.number,
      [labels.details]: entry.details,
      [labels.items]: compactItems(entry),
      [labels.reference]: entry.reference,
      [labels.amount]: moneyNumber(entry.amount),
      [labels.paid]: moneyNumber(entry.paid),
      [labels.due]: isReturn ? "" : moneyNumber(entry.balance),
      [labels.running]: moneyNumber(entry.runningBalance),
      [labels.status]: labels.statusOf(entry.status),
      [labels.month]: formatTimelineMonthLabel(
        timelineMonthKey(entry.date),
        locale
      ),
    }
  })
}

export function timelineExportJsonRecords(
  rows: CustomerTimelineRow[],
  labels: TimelineExportLabels,
  locale: string
): Record<string, unknown>[] {
  return timelineReportEntries(rows).map((entry) => {
    const isReturn = entry.kind === "return"
    return {
      date: entry.date,
      dateLabel: formatTimelineExportDate(entry.date, locale),
      type: isReturn ? labels.returnLabel : labels.invoice,
      document: entry.number,
      details: entry.details,
      reference: entry.reference,
      amount: moneyNumber(entry.amount),
      paid: moneyNumber(entry.paid),
      due: isReturn ? 0 : moneyNumber(entry.balance),
      running: moneyNumber(entry.runningBalance),
      status: labels.statusOf(entry.status),
      month: timelineMonthKey(entry.date),
      items: entry.lines.map((line) => ({
        name: line.name,
        quantity: line.quantity,
        unitPrice: moneyNumber(line.unitPrice),
        amount: moneyNumber(line.lineTotal),
      })),
    }
  })
}

type Cell = string | number

export type TimelineWorkbookSheet = {
  name: string
  rows: Cell[][]
  moneyColumns?: number[]
  columnWidths?: number[]
}

function excelSheetName(name: string, used: Set<string>): string {
  let base = name.replace(/[:\\/?*[\]]/g, " ").replace(/\s+/g, " ").trim()
  if (!base) base = "Sheet"
  base = base.slice(0, 31)
  let next = base
  let index = 2
  while (used.has(next)) {
    const suffix = ` ${index}`
    next = `${base.slice(0, Math.max(1, 31 - suffix.length))}${suffix}`
    index += 1
  }
  used.add(next)
  return next
}

function ledgerHeader(labels: TimelineExportLabels): Cell[] {
  return [
    labels.date,
    labels.type,
    labels.document,
    labels.details,
    labels.reference,
    labels.amount,
    labels.paid,
    labels.due,
    labels.running,
    labels.status,
  ]
}

function ledgerRows(
  entries: TimelineReportEntry[],
  labels: TimelineExportLabels,
  locale: string
): Cell[][] {
  const rows: Cell[][] = []
  for (const entry of entries) {
    const isReturn = entry.kind === "return"
    rows.push([
      formatTimelineExportDate(entry.date, locale),
      isReturn ? labels.returnLabel : labels.invoice,
      entry.number,
      entry.details || "—",
      entry.reference,
      moneyNumber(entry.amount),
      moneyNumber(entry.paid),
      isReturn ? "" : moneyNumber(entry.balance),
      moneyNumber(entry.runningBalance),
      labels.statusOf(entry.status),
    ])
    for (const line of entry.lines) {
      rows.push([
        "",
        "",
        "",
        `${line.name}  × ${line.quantity}  @ ${formatMoney(line.unitPrice)}`,
        "",
        moneyNumber(line.lineTotal),
        "",
        "",
        "",
        "",
      ])
    }
  }
  return rows
}

function totalsBlock(
  labels: TimelineExportLabels,
  values: { total: string; credit: string; remaining: string; balance: string }
): Cell[][] {
  return [
    [labels.total, moneyNumber(values.total)],
    [labels.credit, moneyNumber(values.credit)],
    [labels.remaining, moneyNumber(values.remaining)],
    [labels.balance, moneyNumber(values.balance)],
  ]
}

export function buildCustomerTimelineWorkbookSheets(options: {
  customer: Pick<CustomerRow, "name" | "phone" | "description" | "openingBalance">
  rows: CustomerTimelineRow[]
  company: CompanySettings
  periodLabel: string
  generatedAt: string
  locale: string
  labels: TimelineExportLabels
}): TimelineWorkbookSheet[] {
  const entries = timelineReportEntries(options.rows)
  const groups = groupTimelineByMonth(entries).sort((a, b) =>
    a.month.localeCompare(b.month)
  )
  const overall = summarizeTimeline(entries)
  const { customer, company, labels, locale } = options
  const used = new Set<string>()
  const sheets: TimelineWorkbookSheet[] = []

  const summaryRows: Cell[][] = [
    [labels.title],
    [company.name || "Custoray"],
    [],
    [labels.customer, customer.name],
    [labels.phone, customer.phone],
    [labels.period, options.periodLabel],
    [labels.generated, options.generatedAt],
    [labels.openingBalance, moneyNumber(customer.openingBalance)],
    [],
    ...totalsBlock(labels, overall),
    [],
    [
      labels.monthsHeading,
      labels.total,
      labels.credit,
      labels.remaining,
      labels.balance,
    ],
    ...groups.map((group) => [
      formatTimelineMonthLabel(group.month, locale),
      moneyNumber(group.total),
      moneyNumber(group.credit),
      moneyNumber(group.remaining),
      moneyNumber(group.balance),
    ]),
  ]

  sheets.push({
    name: excelSheetName(labels.title, used),
    rows: summaryRows,
    moneyColumns: [1, 2, 3, 4],
    columnWidths: [28, 18, 16, 16, 16],
  })

  const ledger = [
    ledgerHeader(labels),
    ...ledgerRows(entries, labels, locale),
    [],
    ...totalsBlock(labels, overall),
  ]
  sheets.push({
    name: excelSheetName(labels.ledger, used),
    rows: ledger,
    moneyColumns: [1, 5, 6, 7, 8],
    columnWidths: [14, 12, 16, 42, 16, 14, 14, 14, 14, 14],
  })

  for (const group of groups) {
    const monthEntries = entries.filter(
      (entry) => entry.date.slice(0, 7) === group.month
    )
    sheets.push({
      name: excelSheetName(formatTimelineMonthLabel(group.month, locale), used),
      rows: [
        [formatTimelineMonthLabel(group.month, locale)],
        [],
        ledgerHeader(labels),
        ...ledgerRows(monthEntries, labels, locale),
        [],
        ...totalsBlock(labels, group),
      ],
      moneyColumns: [1, 5, 6, 7, 8],
      columnWidths: [14, 12, 16, 42, 16, 14, 14, 14, 14, 14],
    })
  }

  return sheets
}

export async function downloadCustomerTimelineExcel(options: {
  customer: Pick<CustomerRow, "name" | "phone" | "description" | "openingBalance">
  rows: CustomerTimelineRow[]
  company: CompanySettings
  periodLabel: string
  generatedAt: string
  locale: string
  labels: TimelineExportLabels
  filename: string
}) {
  const XLSX = await import("xlsx")
  const sheets = buildCustomerTimelineWorkbookSheets(options)
  const wb = XLSX.utils.book_new()
  for (const sheet of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(sheet.rows)
    if (sheet.columnWidths) {
      ws["!cols"] = sheet.columnWidths.map((width) => ({ wch: width }))
    }
    if (sheet.moneyColumns) {
      for (let r = 0; r < sheet.rows.length; r += 1) {
        for (const c of sheet.moneyColumns) {
          const value = sheet.rows[r]?.[c]
          if (typeof value !== "number") continue
          const cell = ws[XLSX.utils.encode_cell({ r, c })]
          if (cell) cell.z = "#,##0.00"
        }
      }
    }
    XLSX.utils.book_append_sheet(wb, ws, sheet.name)
  }
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" })
  downloadBlob(
    options.filename,
    new Blob([out], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
  )
}

export function downloadCustomerTimelineCsv(
  rows: CustomerTimelineRow[],
  labels: TimelineExportLabels,
  locale: string,
  filename: string
) {
  const records = timelineExportLabeledRows(rows, labels, locale)
  downloadBlob(
    filename,
    new Blob([`\uFEFF${rowsToCsv(records)}`], {
      type: "text/csv;charset=utf-8",
    })
  )
}

export function downloadCustomerTimelineJson(
  rows: CustomerTimelineRow[],
  labels: TimelineExportLabels,
  locale: string,
  filename: string
) {
  downloadBlob(
    filename,
    new Blob([rowsToJson(timelineExportJsonRecords(rows, labels, locale))], {
      type: "application/json;charset=utf-8",
    })
  )
}
