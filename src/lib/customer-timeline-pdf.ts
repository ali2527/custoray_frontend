import { formatMoney, type CustomerRow } from "@/lib/customers"
import {
  formatTimelineMonthLabel,
  groupTimelineByMonth,
  summarizeTimeline,
  type CustomerTimelineRow,
} from "@/lib/customer-timeline"
import type { CompanySettings } from "@/lib/company-settings"
import { formatDate } from "@/lib/orders"
import {
  timelineReportEntries,
  type TimelineReportEntry,
  type TimelineReportLabels,
} from "@/lib/customer-timeline-report"
import type { jsPDF } from "jspdf"

const GREEN: [number, number, number] = [146, 199, 32]
const MUTED: [number, number, number] = [107, 114, 128]
const DARK: [number, number, number] = [17, 24, 39]
const LINE: [number, number, number] = [229, 231, 235]
const RETURN_RED: [number, number, number] = [185, 28, 28]
const PAGE = { width: 210, height: 297, left: 14, right: 14, top: 16, bottom: 18 }
const CONTENT_WIDTH = PAGE.width - PAGE.left - PAGE.right

type PdfDoc = jsPDF & { lastAutoTable?: { finalY: number } }
type AutoTable = (d: jsPDF, options: Record<string, unknown>) => void

function endY(doc: PdfDoc, fallback: number) {
  return doc.lastAutoTable?.finalY ?? fallback
}

function needPage(doc: PdfDoc, y: number, needed = 28) {
  if (y + needed < PAGE.height - PAGE.bottom) return y
  doc.addPage()
  doc.setFillColor(...GREEN)
  doc.rect(0, 0, PAGE.width, 4, "F")
  return PAGE.top + 6
}

function drawDottedLeader(
  doc: PdfDoc,
  x: number,
  y: number,
  width: number
) {
  doc.setDrawColor(...MUTED)
  doc.setLineWidth(0.2)
  doc.setLineDashPattern([0.6, 0.7], 0)
  doc.line(x, y, x + width, y)
  doc.setLineDashPattern([], 0)
}

function drawFullWidthTotals(
  doc: PdfDoc,
  y: number,
  labels: TimelineReportLabels,
  values: { total: string; credit: string; remaining: string; balance: string }
) {
  const lines = [
    { label: labels.total, value: formatMoney(values.total), color: DARK },
    { label: labels.credit, value: formatMoney(values.credit), color: [4, 120, 87] as [number, number, number] },
    {
      label: labels.remaining,
      value: formatMoney(values.remaining),
      color: Number(values.remaining) > 0 ? ([180, 83, 9] as [number, number, number]) : DARK,
    },
    {
      label: labels.balance,
      value: formatMoney(values.balance),
      color: Number(values.balance) > 0 ? ([180, 83, 9] as [number, number, number]) : DARK,
    },
  ]
  let cursor = y
  for (const line of lines) {
    cursor = needPage(doc, cursor, 10)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(...MUTED)
    doc.text(line.label, PAGE.left, cursor)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(...line.color)
    doc.text(line.value, PAGE.width - PAGE.right, cursor, { align: "right" })
    const labelWidth = doc.getTextWidth(line.label) + 3
    const valueWidth = doc.getTextWidth(line.value) + 3
    const gap = CONTENT_WIDTH - labelWidth - valueWidth
    if (gap > 4) {
      drawDottedLeader(doc, PAGE.left + labelWidth, cursor - 0.6, gap)
    }
    cursor += 7
  }
  return cursor
}

function tableBody(entries: TimelineReportEntry[], labels: TimelineReportLabels) {
  const body: (string | { content: string; colSpan?: number; styles?: Record<string, unknown> })[][] =
    []
  for (const entry of entries) {
    const isReturn = entry.kind === "return"
    body.push([
      formatDate(entry.date),
      isReturn ? labels.returnLabel : labels.invoice,
      entry.number,
      entry.details || "—",
      formatMoney(entry.amount),
      formatMoney(entry.paid),
      isReturn ? "—" : formatMoney(entry.balance),
      formatMoney(entry.runningBalance),
    ])
    for (const line of entry.lines) {
      body.push([
        "",
        "",
        "",
        `${line.name}  × ${line.quantity}  @ ${formatMoney(line.unitPrice)}`,
        formatMoney(line.lineTotal),
        "",
        "",
        "",
      ])
    }
  }
  return body
}

export async function downloadCustomerTimelinePdf(options: {
  customer: Pick<CustomerRow, "name" | "phone" | "description" | "openingBalance">
  rows: CustomerTimelineRow[]
  company: CompanySettings
  periodLabel: string
  generatedAt: string
  locale: string
  labels: TimelineReportLabels
  filename: string
}) {
  const [{ jsPDF }, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ])
  const autoTable = autoTableMod.default as AutoTable
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  }) as PdfDoc
  const { customer, company, periodLabel, generatedAt, locale, labels } = options
  const entries = timelineReportEntries(options.rows)
  const groups = groupTimelineByMonth(entries).sort((a, b) =>
    a.month.localeCompare(b.month)
  )
  const overall = summarizeTimeline(entries)

  doc.setFillColor(...GREEN)
  doc.rect(0, 0, PAGE.width, 4, "F")

  doc.setTextColor(...DARK)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.text(company.name || "Custoray", PAGE.left, 16)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  const companyMeta = [
    company.tagline,
    [company.addressLine1, company.addressLine2].filter((line) => line.trim()).join(", "),
    [company.phone, company.email].filter(Boolean).join("  ·  "),
  ].filter((line) => line.trim())
  let y = 21
  for (const line of companyMeta) {
    doc.text(line, PAGE.left, y, { maxWidth: 110 })
    y += 4
  }

  doc.setTextColor(...GREEN)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.text(labels.title.toUpperCase(), PAGE.width - PAGE.right, 16, { align: "right" })
  doc.setTextColor(...DARK)
  doc.setFontSize(12)
  doc.text(customer.name, PAGE.width - PAGE.right, 22, {
    align: "right",
    maxWidth: 80,
  })
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text(`${labels.period}: ${periodLabel}`, PAGE.width - PAGE.right, 28, {
    align: "right",
    maxWidth: 80,
  })
  doc.text(`${labels.generated}: ${generatedAt}`, PAGE.width - PAGE.right, 33, {
    align: "right",
    maxWidth: 80,
  })

  y = Math.max(y, 38) + 4
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text(labels.openingBalance, PAGE.left, y)
  doc.setTextColor(...DARK)
  doc.text(formatMoney(customer.openingBalance), PAGE.width - PAGE.right, y, {
    align: "right",
  })
  y += 6
  y = drawFullWidthTotals(doc, y, labels, overall) + 4

  for (const group of groups) {
    y = needPage(doc, y, 42)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(...DARK)
    doc.text(formatTimelineMonthLabel(group.month, locale), PAGE.left, y)
    y += 5

    const monthEntries = entries.filter(
      (row) => row.date.slice(0, 7) === group.month
    ) as TimelineReportEntry[]

    autoTable(doc, {
      startY: y,
      margin: {
        left: PAGE.left,
        right: PAGE.right,
        top: PAGE.top + 6,
        bottom: PAGE.bottom,
      },
      tableWidth: CONTENT_WIDTH,
      theme: "grid",
      head: [
        [
          labels.date,
          labels.type,
          labels.document,
          labels.details,
          labels.amount,
          labels.paid,
          labels.due,
          labels.running,
        ],
      ],
      body: tableBody(monthEntries, labels),
      styles: {
        font: "helvetica",
        fontSize: 7,
        cellPadding: { top: 1.4, bottom: 1.4, left: 1.2, right: 1.2 },
        overflow: "linebreak",
        valign: "middle",
        textColor: DARK,
        lineColor: LINE,
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: GREEN,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 6.5,
        halign: "left",
      },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 18 },
        2: { cellWidth: 24 },
        3: { cellWidth: 46 },
        4: { cellWidth: 18, halign: "right" },
        5: { cellWidth: 18, halign: "right" },
        6: { cellWidth: 18, halign: "right" },
        7: { cellWidth: 18, halign: "right" },
      },
      didParseCell: (data: {
        section: string
        column: { index: number }
        row: { raw?: unknown }
        cell: { styles: Record<string, unknown>; text: string[] }
      }) => {
        if (data.section !== "body") return
        const raw = data.row.raw
        if (!Array.isArray(raw)) return
        if (raw[1] === labels.returnLabel) {
          data.cell.styles.textColor = RETURN_RED
        }
        if (!raw[0] && !raw[1] && !raw[2]) {
          data.cell.styles.fontSize = 6.5
          data.cell.styles.textColor = MUTED
          data.cell.styles.fontStyle = "italic"
        }
        if (data.column.index >= 4) data.cell.styles.halign = "right"
      },
    })
    y = drawFullWidthTotals(doc, endY(doc, y) + 6, labels, group) + 8
  }

  if (groups.length > 0) {
    y = needPage(doc, y, 36)
    doc.setDrawColor(...LINE)
    doc.setLineWidth(0.3)
    doc.line(PAGE.left, y, PAGE.width - PAGE.right, y)
    y += 7
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(...DARK)
    doc.text(labels.title, PAGE.left, y)
    y += 6
    drawFullWidthTotals(doc, y, labels, overall)
  }

  const pageCount = doc.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    doc.setDrawColor(...LINE)
    doc.setLineWidth(0.2)
    doc.line(PAGE.left, PAGE.height - 12, PAGE.width - PAGE.right, PAGE.height - 12)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7.5)
    doc.setTextColor(...MUTED)
    doc.text(
      `${labels.title}  ·  ${customer.name}`,
      PAGE.left,
      PAGE.height - 7
    )
    doc.text(`${page} / ${pageCount}`, PAGE.width - PAGE.right, PAGE.height - 7, {
      align: "right",
    })
  }

  doc.save(options.filename)
}
