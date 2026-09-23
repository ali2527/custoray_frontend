import { formatMoney, type CustomerRow } from "@/lib/customers"
import {
  formatTimelineMonthLabel,
  groupTimelineByMonth,
  summarizeTimeline,
  type CustomerTimelineRow,
} from "@/lib/customer-timeline"
import type { CompanySettings } from "@/lib/company-settings"
import { formatDate } from "@/lib/orders"

export type TimelineReportLabels = {
  title: string
  customer: string
  phone: string
  period: string
  generated: string
  date: string
  type: string
  document: string
  details: string
  reference: string
  amount: string
  paid: string
  due: string
  running: string
  status: string
  invoice: string
  returnLabel: string
  item: string
  qty: string
  rate: string
  lineAmount: string
  total: string
  credit: string
  remaining: string
  balance: string
  openingBalance: string
  statusOf: (status: string) => string
}

export type TimelineReportLine = {
  name: string
  quantity: number
  unitPrice: string
  lineTotal: string
}

export type TimelineReportEntry = CustomerTimelineRow & {
  lines: TimelineReportLine[]
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function timelineReportEntries(
  rows: CustomerTimelineRow[]
): TimelineReportEntry[] {
  return [...rows]
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    .map((row) => ({
      ...row,
      lines:
        row.kind === "return"
          ? (row.returnDoc?.lines ?? []).map((line) => ({
              name: line.productName,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              lineTotal: line.lineTotal,
            }))
          : row.kind === "purchase"
            ? (row.purchase?.lines ?? []).map((line) => ({
                name: line.productName,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                lineTotal: line.lineTotal,
              }))
            : (row.order?.lines ?? []).map((line) => ({
                name: line.productName,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                lineTotal: line.lineTotal,
              })),
    }))
}

function companyLines(company: CompanySettings): string {
  return [
    company.addressLine1,
    company.addressLine2,
    [company.phone, company.email].filter(Boolean).join(" · "),
  ]
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => escapeHtml(line))
    .join("<br />")
}

function totalsBlock(
  labels: TimelineReportLabels,
  values: { total: string; credit: string; remaining: string; balance: string },
  extra?: { label: string; value: string }
): string {
  const rows = [
    extra
      ? `<div class="total-row"><span>${escapeHtml(extra.label)}</span><span>${escapeHtml(formatMoney(extra.value))}</span></div>`
      : "",
    `<div class="total-row"><span>${escapeHtml(labels.total)}</span><span>${escapeHtml(formatMoney(values.total))}</span></div>`,
    `<div class="total-row credit"><span>${escapeHtml(labels.credit)}</span><span>${escapeHtml(formatMoney(values.credit))}</span></div>`,
    `<div class="total-row remaining"><span>${escapeHtml(labels.remaining)}</span><span>${escapeHtml(formatMoney(values.remaining))}</span></div>`,
    `<div class="total-row grand"><span>${escapeHtml(labels.balance)}</span><span>${escapeHtml(formatMoney(values.balance))}</span></div>`,
  ]
  return `<div class="totals">${rows.join("")}</div>`
}

function itemRows(entry: TimelineReportEntry, labels: TimelineReportLabels): string {
  if (entry.lines.length === 0) return ""
  const body = entry.lines
    .map(
      (line, index) => `
        <tr class="${index % 2 === 0 ? "row-even" : "row-odd"}">
          <td>${escapeHtml(line.name)}</td>
          <td class="num">${line.quantity}</td>
          <td class="num">${escapeHtml(formatMoney(line.unitPrice))}</td>
          <td class="num">${escapeHtml(formatMoney(line.lineTotal))}</td>
        </tr>`
    )
    .join("")
  return `
    <tr class="items-row">
      <td colspan="10">
        <table class="items">
          <thead>
            <tr>
              <th>${escapeHtml(labels.item)}</th>
              <th class="num">${escapeHtml(labels.qty)}</th>
              <th class="num">${escapeHtml(labels.rate)}</th>
              <th class="num">${escapeHtml(labels.lineAmount)}</th>
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </td>
    </tr>`
}

export function buildCustomerTimelineReportHtml(options: {
  customer: Pick<CustomerRow, "name" | "phone" | "description" | "openingBalance">
  rows: CustomerTimelineRow[]
  company: CompanySettings
  logoSrc: string
  periodLabel: string
  generatedAt: string
  locale: string
  labels: TimelineReportLabels
}): string {
  const { customer, company, logoSrc, periodLabel, generatedAt, locale, labels } =
    options
  const entries = timelineReportEntries(options.rows)
  const groups = groupTimelineByMonth(entries).sort((a, b) =>
    a.month.localeCompare(b.month)
  )
  const overall = summarizeTimeline(entries)
  const monthsHtml = groups
    .map((group) => {
      const monthEntries = entries.filter(
        (row) => row.date.slice(0, 7) === group.month
      )
      const body = monthEntries
        .map((entry, index) => {
          const isReturn = entry.kind === "return"
          const type = isReturn ? labels.returnLabel : labels.invoice
          return `
            <tr class="${index % 2 === 0 ? "row-even" : "row-odd"} ${isReturn ? "is-return" : ""}">
              <td>${escapeHtml(formatDate(entry.date))}</td>
              <td>${escapeHtml(type)}</td>
              <td class="doc">${escapeHtml(entry.number)}</td>
              <td>${escapeHtml(entry.details || "—")}</td>
              <td>${escapeHtml(entry.reference || "—")}</td>
              <td class="num">${escapeHtml(formatMoney(entry.amount))}</td>
              <td class="num">${escapeHtml(formatMoney(entry.paid))}</td>
              <td class="num">${isReturn ? "—" : escapeHtml(formatMoney(entry.balance))}</td>
              <td class="num">${escapeHtml(formatMoney(entry.runningBalance))}</td>
              <td>${escapeHtml(labels.statusOf(entry.status))}</td>
            </tr>
            ${itemRows(entry, labels)}`
        })
        .join("")
      return `
        <section class="month">
          <h2>${escapeHtml(formatTimelineMonthLabel(group.month, locale))}</h2>
          <table class="ledger">
            <thead>
              <tr>
                <th>${escapeHtml(labels.date)}</th>
                <th>${escapeHtml(labels.type)}</th>
                <th>${escapeHtml(labels.document)}</th>
                <th>${escapeHtml(labels.details)}</th>
                <th>${escapeHtml(labels.reference)}</th>
                <th class="num">${escapeHtml(labels.amount)}</th>
                <th class="num">${escapeHtml(labels.paid)}</th>
                <th class="num">${escapeHtml(labels.due)}</th>
                <th class="num">${escapeHtml(labels.running)}</th>
                <th>${escapeHtml(labels.status)}</th>
              </tr>
            </thead>
            <tbody>${body}</tbody>
          </table>
          <div class="month-totals">
            ${totalsBlock(labels, group)}
          </div>
        </section>`
    })
    .join("")

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(labels.title)} — ${escapeHtml(customer.name)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Segoe UI", Arial, sans-serif;
      color: #111827;
      background: #fff;
      font-size: 12px;
      line-height: 1.45;
    }
    .page { width: 794px; margin: 0 auto; padding: 36px 40px 48px; }
    .accent { height: 6px; border-radius: 999px; background: linear-gradient(90deg, #92c720 0%, #7aa818 100%); margin-bottom: 24px; }
    .header { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 28px; }
    .brand { display: flex; gap: 14px; align-items: center; max-width: 58%; }
    .logo { width: 64px; height: 64px; object-fit: contain; }
    .brand h1 { font-size: 22px; letter-spacing: -0.02em; }
    .brand p { color: #6b7280; font-size: 11px; margin-top: 2px; }
    .company { color: #4b5563; font-size: 11px; margin-top: 8px; line-height: 1.55; }
    .doc-meta { text-align: right; }
    .eyebrow { color: #92c720; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }
    .doc-meta h2 { font-size: 20px; margin-top: 4px; }
    .meta { color: #6b7280; font-size: 11px; margin-top: 8px; line-height: 1.6; }
    .party { display: flex; justify-content: flex-end; margin-bottom: 28px; }
    .card { width: 260px; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px 16px; background: #fafafa; }
    .card .label { color: #6b7280; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 6px; }
    .month { margin-top: 28px; page-break-inside: avoid; }
    .month h2 { font-size: 15px; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; }
    .ledger { border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; }
    .ledger thead th {
      background: #92c720;
      color: #fff;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 9px 8px;
      text-align: left;
    }
    .ledger td { padding: 8px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
    .ledger .doc { font-weight: 600; }
    .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .row-odd { background: #fafafa; }
    .is-return td { color: #b91c1c; }
    .items-row td { background: #f8fafc; padding: 0 8px 10px; }
    .items { margin-top: 6px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
    .items th { background: #f3f4f6; color: #4b5563; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; padding: 6px 8px; text-align: left; }
    .items td { padding: 6px 8px; border-bottom: 1px solid #f3f4f6; }
    .month-totals, .grand-wrap { display: flex; justify-content: flex-end; margin-top: 12px; }
    .totals { width: 260px; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 14px; border-bottom: 1px solid #f3f4f6; }
    .total-row:last-child { border-bottom: none; }
    .total-row span:first-child { color: #6b7280; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; }
    .total-row span:last-child { font-weight: 700; }
    .total-row.credit span:last-child { color: #047857; }
    .total-row.remaining span:last-child { color: #b45309; }
    .total-row.grand { background: #92c720; }
    .total-row.grand span { color: #fff; }
    .grand-wrap { margin-top: 32px; }
    .empty { color: #6b7280; padding: 32px 0; text-align: center; }
    @media print {
      .page { width: auto; padding: 0; }
      .month { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="accent"></div>
    <header class="header">
      <div class="brand">
        <img class="logo" src="${escapeHtml(logoSrc)}" alt="" />
        <div>
          <h1>${escapeHtml(company.name || "Custoray")}</h1>
          ${company.tagline ? `<p>${escapeHtml(company.tagline)}</p>` : ""}
          <div class="company">${companyLines(company)}</div>
        </div>
      </div>
      <div class="doc-meta">
        <div class="eyebrow">${escapeHtml(labels.title)}</div>
        <h2>${escapeHtml(customer.name)}</h2>
        <div class="meta">
          ${escapeHtml(labels.period)}: ${escapeHtml(periodLabel)}<br />
          ${escapeHtml(labels.generated)}: ${escapeHtml(generatedAt)}
        </div>
      </div>
    </header>
    <section class="party">
      <div class="card">
        <div class="label">${escapeHtml(labels.balance)}</div>
        ${totalsBlock(labels, overall, {
          label: labels.openingBalance,
          value: customer.openingBalance,
        })}
      </div>
    </section>
    ${monthsHtml || `<p class="empty">${escapeHtml(labels.details)}</p>`}
    ${
      groups.length > 0
        ? `<div class="grand-wrap">${totalsBlock(labels, overall)}</div>`
        : ""
    }
  </div>
</body>
</html>`
}
