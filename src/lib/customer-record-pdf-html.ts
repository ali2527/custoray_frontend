import type { CompanySettings } from "@/lib/company-settings"
import { formatMoney, type CustomerRecord } from "@/lib/customer-record"
import {
  DEFAULT_DOCUMENT_DISPLAY_FLAGS,
  filterDocumentLines,
  type DocumentDisplayFlags,
} from "@/lib/document-display-settings"
import { formatDate } from "@/lib/orders"
import {
  defaultInvoiceBuilderConfig,
  resolveInvoiceTemplate,
  type InvoiceBuilderConfig,
  type InvoiceTemplateColorOverrides,
  type InvoiceTemplateDefinition,
  type InvoiceTemplateId,
} from "@/lib/invoice-templates"

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function credit(amount: string): string {
  return `(${escapeHtml(formatMoney(amount))})`
}

function templateStyles(template: InvoiceTemplateDefinition): string {
  const accentSecondary =
    template.id === "classic" ? "#7aa818" : template.accent
  const metaTextColor = template.headerPanel ? template.headerText : "#111827"
  const brandTitleColor = template.headerPanel ? template.headerText : "#111827"
  const brandSubColor = template.headerPanel ? "rgba(255,255,255,0.82)" : "#6b7280"
  const companyMetaColor = template.headerPanel ? "rgba(255,255,255,0.75)" : "#4b5563"
  const invoiceNumberColor = template.headerPanel ? template.headerText : "#111827"
  const metaLabelColor = template.headerPanel ? "rgba(255,255,255,0.7)" : "#6b7280"

  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4; margin: 16mm 14mm 18mm; }
    body {
      font-family: ${template.fontFamily};
      color: #1a1a1a;
      background: #ffffff;
      font-size: 12.5px;
      line-height: 1.5;
    }
    .accent-bar {
      display: ${template.showAccentBar ? "block" : "none"};
      height: 6px;
      background: linear-gradient(90deg, ${template.accent} 0%, ${accentSecondary} 100%);
      border-radius: 999px;
      margin-bottom: 22px;
    }
    .header-panel {
      background: ${template.headerPanel ? template.headerBg : "transparent"};
      margin: 0 0 22px;
      padding: ${template.headerPanel ? "18px 18px 16px" : "0"};
      border-radius: ${template.headerPanel ? "0 0 12px 12px" : "0"};
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
      max-width: 58%;
    }
    .logo {
      width: 64px;
      height: 64px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .brand-text h1 {
      font-size: 22px;
      font-weight: 700;
      color: ${brandTitleColor};
      letter-spacing: -0.02em;
    }
    .brand-text p {
      color: ${brandSubColor};
      font-size: 12px;
      margin-top: 2px;
    }
    .company-meta {
      color: ${companyMetaColor};
      font-size: 11px;
      margin-top: 8px;
      line-height: 1.6;
    }
    .invoice-meta { text-align: right; min-width: 210px; }
    .invoice-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: ${template.accent};
      font-weight: 700;
      margin-bottom: 4px;
    }
    .invoice-number {
      font-size: 22px;
      font-weight: 700;
      color: ${invoiceNumberColor};
      letter-spacing: -0.03em;
    }
    .meta-grid { margin-top: 12px; display: grid; gap: 6px; font-size: 12px; }
    .meta-row { display: flex; justify-content: space-between; gap: 16px; }
    .meta-row span:first-child { color: ${metaLabelColor}; }
    .meta-row span:last-child { color: ${metaTextColor}; font-weight: 600; }
    .bill-to {
      background: ${template.billToBg};
      border: 1px solid ${template.billToBorder};
      border-radius: 12px;
      padding: 14px 16px;
      margin-bottom: 22px;
    }
    .section-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: ${template.accent};
      font-weight: 700;
      margin-bottom: 6px;
    }
    .customer-name { font-size: 16px; font-weight: 700; color: #111827; }
    .customer-notes { color: #6b7280; font-size: 12px; margin-top: 4px; }
    .month {
      margin-bottom: 22px;
      break-inside: avoid;
    }
    .month-title {
      font-size: 14px;
      font-weight: 700;
      color: #111827;
      padding-bottom: 8px;
      margin-bottom: 8px;
      border-bottom: 2px solid ${template.accent};
    }
    .balance-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      font-size: 12px;
      border: 1px solid ${template.billToBorder};
      border-radius: 8px;
      margin: 8px 0;
      background: ${template.billToBg};
    }
    .balance-row span:first-child { color: #6b7280; font-weight: 600; }
    .balance-row span:last-child { font-weight: 700; color: #111827; }
    .balance-row.closing {
      background: ${template.grandTotalBg};
    }
    .balance-row.closing span { color: ${template.grandTotalText}; }
    .doc {
      margin: 12px 0;
      border: 1px solid ${template.billToBorder};
      border-radius: 10px;
      overflow: hidden;
      break-inside: avoid;
    }
    .doc.return { border-color: #fecaca; }
    .doc-head {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 8px 12px;
      background: #f9fafb;
      font-size: 12px;
      font-weight: 700;
    }
    .doc.return .doc-head { background: #fef2f2; color: #991b1b; }
    .doc-head-meta { color: #6b7280; font-weight: 600; }
    .doc.return .doc-head-meta { color: #b91c1c; }
    table { width: 100%; border-collapse: collapse; }
    thead th {
      background: ${template.tableHeadBg};
      color: ${template.tableHeadText};
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 600;
      padding: 8px 12px;
      text-align: left;
    }
    thead th.num { text-align: right; }
    tbody td {
      padding: 8px 12px;
      border-bottom: 1px solid #f3f4f6;
      vertical-align: top;
    }
    tbody tr:nth-child(even) { background: #fafafa; }
    .num { text-align: right; white-space: nowrap; }
    .amount { font-weight: 700; color: #111827; }
    .credit { color: #b91c1c; font-weight: 700; }
    .doc-total {
      display: flex;
      justify-content: space-between;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 700;
      background: #f9fafb;
      border-top: 1px solid ${template.billToBorder};
    }
    .empty {
      color: #6b7280;
      font-size: 13px;
      padding: 18px 8px;
      text-align: center;
    }
    .final {
      margin-top: 8px;
      border: 1px solid ${template.billToBorder};
      border-radius: 12px;
      overflow: hidden;
      width: 320px;
      margin-left: auto;
    }
    .final-title {
      padding: 10px 16px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
      color: ${template.accent};
      background: ${template.billToBg};
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 9px 16px;
      font-size: 12px;
      border-top: 1px solid #f3f4f6;
    }
    .total-row span:first-child { color: #6b7280; }
    .total-row span:last-child { font-weight: 600; color: #111827; }
    .total-row.grand {
      background: ${template.grandTotalBg};
    }
    .total-row.grand span { color: ${template.grandTotalText}; font-weight: 700; }
    .footer {
      margin-top: 28px;
      padding-top: 14px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      gap: 24px;
      color: #6b7280;
      font-size: 11px;
    }
    .footer strong { color: #111827; display: block; margin-bottom: 4px; }
  `
}

function lineTable(
  lines: CustomerRecord["months"][number]["invoices"][number]["lines"],
  creditAmounts: boolean
): string {
  const body = lines
    .map((line, index) => {
      const amount = creditAmounts
        ? `<td class="num credit">${credit(line.lineTotal)}</td>`
        : `<td class="num amount">${escapeHtml(formatMoney(line.lineTotal))}</td>`
      return `<tr class="${index % 2 === 0 ? "" : "alt"}">
        <td>${escapeHtml(line.productName)}</td>
        <td class="num">${line.quantity}</td>
        <td class="num">${escapeHtml(formatMoney(line.unitPrice))}</td>
        ${amount}
      </tr>`
    })
    .join("")

  return `<table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="num">Qty</th>
        <th class="num">Unit Price</th>
        <th class="num">Amount</th>
      </tr>
    </thead>
    <tbody>${body}</tbody>
  </table>`
}

function monthHtml(
  month: CustomerRecord["months"][number],
  display: DocumentDisplayFlags
): string {
  const invoices = month.invoices
    .map((invoice) => {
      const lines = filterDocumentLines(invoice.lines, display)
      return `<div class="doc">
      <div class="doc-head">
        <span>${escapeHtml(invoice.invoiceNumber)}</span>
        <span class="doc-head-meta">${escapeHtml(formatDate(invoice.orderDate))}</span>
      </div>
      ${lines.length > 0 ? lineTable(lines, false) : ""}
      <div class="doc-total">
        <span>Invoice total</span>
        <span>${escapeHtml(formatMoney(invoice.totalAmount))}</span>
      </div>
    </div>`
    })
    .join("")

  const returns = month.returns
    .map((doc) => {
      const linked = doc.referenceNumber && doc.referenceNumber !== "—"
        ? ` · return of ${escapeHtml(doc.referenceNumber)}`
        : ""
      const lines = filterDocumentLines(doc.lines, display)
      return `<div class="doc return">
      <div class="doc-head">
        <span>${escapeHtml(doc.returnNumber)}${linked}</span>
        <span class="doc-head-meta">${escapeHtml(formatDate(doc.returnDate))}</span>
      </div>
      ${lines.length > 0 ? lineTable(lines, true) : ""}
      <div class="doc-total">
        <span>Return total</span>
        <span class="credit">${credit(doc.totalAmount)}</span>
      </div>
    </div>`
    })
    .join("")

  return `<section class="month">
    <h2 class="month-title">${escapeHtml(month.title)}</h2>
    ${
      display.showCustomerBalance
        ? `<div class="balance-row">
      <span>Opening balance</span>
      <span>${escapeHtml(formatMoney(month.opening))}</span>
    </div>`
        : ""
    }
    ${invoices}
    ${returns}
    ${
      display.showCustomerBalance
        ? `<div class="balance-row closing">
      <span>Closing balance</span>
      <span>${escapeHtml(formatMoney(month.closing))}</span>
    </div>`
        : ""
    }
  </section>`
}

export function buildCustomerRecordPdfHtml(
  record: CustomerRecord,
  company: CompanySettings,
  logoSrc: string,
  templateId: InvoiceTemplateId = "classic",
  colorOverrides?: InvoiceTemplateColorOverrides,
  builder?: InvoiceBuilderConfig,
  display: DocumentDisplayFlags = DEFAULT_DOCUMENT_DISPLAY_FLAGS
): string {
  const template = resolveInvoiceTemplate(templateId, colorOverrides)
  const config = builder ?? defaultInvoiceBuilderConfig()
  const companyName = config.companyNameOverride.trim() || company.name
  const companyTagline = config.companyTaglineOverride.trim()
  const companyAddress = config.companyAddressOverride.trim()
    ? escapeHtml(config.companyAddressOverride.trim()).replace(/\n/g, "<br />")
    : `${escapeHtml(company.addressLine1)}<br />${escapeHtml(company.addressLine2)}`
  const companyContact = config.companyContactOverride.trim()
    ? escapeHtml(config.companyContactOverride.trim())
    : `${escapeHtml(company.phone)} · ${escapeHtml(company.email)}`
  const effectiveLogo = config.logoUrlOverride.trim().startsWith("data:")
    ? config.logoUrlOverride.trim()
    : logoSrc

  const monthsHtml =
    record.months.length > 0
      ? record.months.map((month) => monthHtml(month, display)).join("")
      : `<p class="empty">No invoices or returns through ${escapeHtml(formatDate(record.asOf))}.</p>`

  const notes =
    record.customer.description && record.customer.description !== "—"
      ? `<div class="customer-notes">${escapeHtml(record.customer.description)}</div>`
      : ""
  const phone =
    record.customer.phone && record.customer.phone !== "—"
      ? `<div class="customer-notes">${escapeHtml(record.customer.phone)}</div>`
      : ""

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Customer Record · ${escapeHtml(record.customer.name)}</title>
  <style>${templateStyles(template)}</style>
</head>
<body>
  <div class="accent-bar"></div>
  <div class="header-panel">
    <div class="header">
      <div class="brand">
        ${effectiveLogo ? `<img class="logo" src="${effectiveLogo}" alt="${escapeHtml(companyName)}" />` : ""}
        <div class="brand-text">
          <h1>${escapeHtml(companyName)}</h1>
          <p>${escapeHtml(companyTagline)}</p>
          <div class="company-meta">${companyAddress}<br />${companyContact}</div>
        </div>
      </div>
      <div class="invoice-meta">
        <div class="invoice-label">Customer Record</div>
        <div class="invoice-number">As of ${escapeHtml(formatDate(record.asOf))}</div>
        <div class="meta-grid">
          <div class="meta-row"><span>Customer ID</span><span>#${record.customer.id}</span></div>
        </div>
      </div>
    </div>
  </div>

  <div class="bill-to">
    <div class="section-title">Customer</div>
    <div class="customer-name">${escapeHtml(record.customer.name)}</div>
    ${phone}
    ${notes}
  </div>

  ${monthsHtml}

  <div class="final">
    <div class="final-title">Final total</div>
    ${display.showCustomerBalance ? `<div class="total-row"><span>Opening balance</span><span>${escapeHtml(formatMoney(record.totals.opening))}</span></div>` : ""}
    <div class="total-row"><span>Total invoices</span><span>${escapeHtml(formatMoney(record.totals.invoiceTotal))}</span></div>
    <div class="total-row"><span>Total returns</span><span class="credit">${credit(record.totals.returnTotal)}</span></div>
    ${display.showCustomerBalance ? `<div class="total-row grand"><span>Closing balance</span><span>${escapeHtml(formatMoney(record.totals.closing))}</span></div>` : ""}
  </div>

  <div class="footer">
    <div>
      <strong>${escapeHtml(companyName)}</strong>
      ${escapeHtml(company.email)} · ${escapeHtml(company.phone)}
    </div>
    <div style="text-align: right;">
      Generated by Custoray<br />
      ${escapeHtml(record.customer.name)} · ${escapeHtml(formatDate(record.asOf))}
    </div>
  </div>
</body>
</html>`
}
