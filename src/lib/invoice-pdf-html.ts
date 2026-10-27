import type { CompanySettings } from "@/lib/company-settings"
import {
  DEFAULT_DOCUMENT_DISPLAY_FLAGS,
  filterDocumentLines,
  type DocumentDisplayFlags,
} from "@/lib/document-display-settings"
import {
  defaultInvoiceBuilderConfig,
  resolveInvoiceTemplate,
  type InvoiceBuilderConfig,
  type InvoiceTemplateColorOverrides,
  type InvoiceTemplateCopy,
  type InvoiceTemplateDefinition,
  type InvoiceTemplateId,
} from "@/lib/invoice-templates"
import {
  computeBalance,
  formatDate,
  formatMoney,
  statusLabel,
  type OrderRow,
} from "@/lib/orders"

export type InvoicePdfDisplayOptions = {
  display?: DocumentDisplayFlags
  customerBalance?: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function lineRows(
  order: OrderRow,
  show: (id: keyof InvoiceBuilderConfig["fields"]) => boolean,
  labels: InvoiceBuilderConfig["labels"]
): string {
  const columns = [
    show("line_row_number")
      ? { cls: "col-row", header: labels.rowNumberColumn, cell: (_line: OrderRow["lines"][number], index: number) => String(index + 1) }
      : null,
    show("line_description")
      ? { cls: "col-product", header: labels.descriptionColumn, cell: (line: OrderRow["lines"][number]) => escapeHtml(line.productName) }
      : null,
    show("line_qty")
      ? { cls: "col-qty", header: labels.qtyColumn, cell: (line: OrderRow["lines"][number]) => String(line.quantity) }
      : null,
    show("line_unit_price")
      ? { cls: "col-rate", header: labels.rateColumn, cell: (line: OrderRow["lines"][number]) => escapeHtml(formatMoney(line.unitPrice)) }
      : null,
    show("line_amount")
      ? { cls: "col-amount", header: labels.amountColumn, cell: (line: OrderRow["lines"][number]) => escapeHtml(formatMoney(line.lineTotal)) }
      : null,
  ].filter((col): col is NonNullable<typeof col> => col !== null)

  if (columns.length === 0) return ""

  const head = columns
    .map((col) => `<th class="${col.cls}">${escapeHtml(col.header)}</th>`)
    .join("")

  const body = order.lines
    .map((line, index) => {
      const cells = columns
        .map((col) => `<td class="${col.cls}">${col.cell(line, index)}</td>`)
        .join("")
      return `<tr class="${index % 2 === 0 ? "row-even" : "row-odd"}">${cells}</tr>`
    })
    .join("")

  return `<thead><tr>${head}</tr></thead><tbody>${body}</tbody>`
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
    body {
      font-family: ${template.fontFamily};
      color: #1a1a1a;
      background: #ffffff;
      font-size: 13px;
      line-height: 1.5;
    }
    .page {
      width: 794px;
      min-height: 1123px;
      margin: 0 auto;
      padding: 40px 48px 48px;
    }
    .accent-bar {
      display: ${template.showAccentBar ? "block" : "none"};
      height: 6px;
      background: linear-gradient(90deg, ${template.accent} 0%, ${accentSecondary} 100%);
      border-radius: 999px;
      margin-bottom: 28px;
    }
    .header-panel {
      background: ${template.headerPanel ? template.headerBg : "transparent"};
      margin: ${template.headerPanel ? "0 -48px 32px" : "0 0 32px"};
      padding: ${template.headerPanel ? "28px 48px 24px" : "0"};
      border-radius: ${template.headerPanel ? "0 0 16px 16px" : "0"};
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
      gap: 16px;
      max-width: 55%;
    }
    .logo {
      width: 72px;
      height: 72px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .brand-text h1 {
      font-size: 24px;
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
    .invoice-meta {
      text-align: right;
      min-width: 220px;
    }
    .invoice-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: ${template.headerPanel ? template.accent : template.accent};
      font-weight: 700;
      margin-bottom: 4px;
    }
    .invoice-number {
      font-size: 28px;
      font-weight: 700;
      color: ${invoiceNumberColor};
      letter-spacing: -0.03em;
    }
    .meta-grid {
      margin-top: 14px;
      display: grid;
      gap: 6px;
      font-size: 12px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
    }
    .meta-row span:first-child { color: ${metaLabelColor}; }
    .meta-row span:last-child { color: ${metaTextColor}; font-weight: 600; }
    .status-pill {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 999px;
      background: ${template.accentMuted};
      color: ${template.accent};
      font-size: 11px;
      font-weight: 600;
    }
    .section { margin-bottom: 24px; }
    .bill-to {
      background: ${template.billToBg};
      border: 1px solid ${template.billToBorder};
      border-radius: 12px;
      padding: 16px 18px;
    }
    .section-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: ${template.accent};
      font-weight: 700;
      margin-bottom: 8px;
    }
    .customer-name {
      font-size: 16px;
      font-weight: 700;
      color: #111827;
    }
    .customer-notes {
      color: #6b7280;
      font-size: 12px;
      margin-top: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid ${template.billToBorder};
      border-radius: 12px;
      overflow: hidden;
    }
    thead th {
      background: ${template.tableHeadBg};
      color: ${template.tableHeadText};
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 600;
      padding: 12px 14px;
      text-align: left;
    }
    thead th.col-row,
    thead th.col-qty,
    thead th.col-rate,
    thead th.col-amount { text-align: right; }
    tbody td {
      padding: 12px 14px;
      border-bottom: 1px solid #f3f4f6;
      vertical-align: top;
    }
    tbody tr:last-child td { border-bottom: none; }
    .row-even { background: #ffffff; }
    .row-odd { background: #fafafa; }
    .col-product { width: 46%; font-weight: 500; }
    .col-qty, .col-rate, .col-amount, .col-row { text-align: right; white-space: nowrap; }
    .col-amount { font-weight: 700; color: #111827; }
    .totals-wrap {
      display: flex;
      justify-content: flex-end;
      margin-top: 20px;
    }
    .totals {
      width: 280px;
      border: 1px solid ${template.billToBorder};
      border-radius: 12px;
      overflow: hidden;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 16px;
      font-size: 12px;
      border-bottom: 1px solid #f3f4f6;
    }
    .total-row:last-child { border-bottom: none; }
    .total-row span:first-child { color: #6b7280; }
    .total-row span:last-child { font-weight: 600; color: #111827; }
    .total-row.grand {
      background: ${template.grandTotalBg};
      color: ${template.grandTotalText};
      font-size: 14px;
    }
    .total-row.grand span { color: ${template.grandTotalText}; font-weight: 700; }
    .total-row.balance-due span:last-child { color: #b45309; }
    .footer {
      margin-top: 36px;
      padding-top: 18px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      gap: 24px;
      color: #6b7280;
      font-size: 11px;
    }
    .footer strong { color: #111827; display: block; margin-bottom: 4px; }
    .thank-you {
      margin-top: 28px;
      text-align: center;
      color: ${template.accent};
      font-size: 14px;
      font-weight: 600;
    }
  `
}

export function buildInvoicePdfHtml(
  order: OrderRow,
  company: CompanySettings,
  logoSrc: string,
  templateId: InvoiceTemplateId = "classic",
  _copy?: InvoiceTemplateCopy,
  colorOverrides?: InvoiceTemplateColorOverrides,
  builder?: InvoiceBuilderConfig,
  options?: InvoicePdfDisplayOptions
): string {
  const display = options?.display ?? DEFAULT_DOCUMENT_DISPLAY_FLAGS
  const visibleOrder: OrderRow = {
    ...order,
    lines: filterDocumentLines(order.lines, display),
  }
  const balance = computeBalance(order)
  const status = statusLabel(order.status)
  const template = resolveInvoiceTemplate(templateId, colorOverrides)
  const config = builder ?? defaultInvoiceBuilderConfig()
  const labels = config.labels
  const show = (id: keyof InvoiceBuilderConfig["fields"]) => config.fields[id]
  const showCustomerBalance =
    display.showCustomerBalance && options?.customerBalance !== undefined
  const showLineTable =
    show("line_items") &&
    visibleOrder.lines.length > 0 &&
    (show("line_row_number") ||
      show("line_description") ||
      show("line_qty") ||
      show("line_unit_price") ||
      show("line_amount"))
  const lineTableHtml = showLineTable ? lineRows(visibleOrder, show, labels) : ""

  const companyName = config.companyNameOverride.trim() || company.name
  const companyTagline = config.companyTaglineOverride.trim()
  const companyAddress = config.companyAddressOverride.trim()
    ? config.companyAddressOverride.trim()
    : `${company.addressLine1}<br />${company.addressLine2}`
  const companyContact = config.companyContactOverride.trim()
    ? config.companyContactOverride.trim()
    : `${company.phone} · ${company.email}`
  const effectiveLogo = config.logoUrlOverride.trim().startsWith("data:")
    ? config.logoUrlOverride.trim()
    : logoSrc

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(order.invoiceNumber)}</title>
  <style>${templateStyles(template)}</style>
</head>
<body>
  <div class="page">
    <div class="accent-bar"></div>

    <div class="header-panel">
    <div class="header">
      <div class="brand">
        ${show("company_logo") ? `<img class="logo" src="${effectiveLogo}" alt="${escapeHtml(companyName)}" />` : ""}
        <div class="brand-text">
          ${show("company_name") ? `<h1>${escapeHtml(companyName)}</h1>` : ""}
          ${show("company_tagline") ? `<p>${escapeHtml(companyTagline)}</p>` : ""}
          ${
            show("company_address") || show("company_contact")
              ? `<div class="company-meta">
            ${show("company_address") ? `${companyAddress}<br />` : ""}
            ${show("company_contact") ? escapeHtml(companyContact) : ""}
          </div>`
              : ""
          }
        </div>
      </div>
      <div class="invoice-meta">
        ${show("document_title") ? `<div class="invoice-label">${escapeHtml(labels.documentTitle)}</div>` : ""}
        ${show("invoice_number") ? `<div class="invoice-number">${escapeHtml(order.invoiceNumber)}</div>` : ""}
        ${
          show("invoice_date") || show("invoice_id") || show("invoice_status")
            ? `<div class="meta-grid">
          ${show("invoice_date") ? `<div class="meta-row"><span>${escapeHtml(labels.dateLabel)}</span><span>${escapeHtml(formatDate(order.orderDate))}</span></div>` : ""}
          ${show("invoice_id") ? `<div class="meta-row"><span>${escapeHtml(labels.invoiceIdLabel)}</span><span>#${order.id}</span></div>` : ""}
          ${show("invoice_status") ? `<div class="meta-row"><span>${escapeHtml(labels.statusLabel)}</span><span class="status-pill">${escapeHtml(status)}</span></div>` : ""}
        </div>`
            : ""
        }
      </div>
    </div>
    </div>

    ${
      show("bill_to") || show("customer_name") || show("customer_notes")
        ? `<div class="section bill-to">
      ${show("bill_to") ? `<div class="section-title">${escapeHtml(labels.billToLabel)}</div>` : ""}
      ${show("customer_name") ? `<div class="customer-name">${escapeHtml(order.customerName)}</div>` : ""}
      ${
        show("customer_notes") && order.description && order.description !== "—"
          ? `<div class="customer-notes">${escapeHtml(order.description)}</div>`
          : ""
      }
    </div>`
        : ""
    }

    ${
      showLineTable ||
      show("subtotal") ||
      show("paid") ||
      show("balance_due") ||
      show("total") ||
      showCustomerBalance
        ? `<div class="section">
      ${
        showLineTable
          ? `<table>${lineTableHtml}</table>`
          : ""
      }

      <div class="totals-wrap">
        <div class="totals">
          ${show("subtotal") ? `<div class="total-row"><span>${escapeHtml(labels.subtotalLabel)}</span><span>${escapeHtml(formatMoney(order.totalAmount))}</span></div>` : ""}
          ${show("paid") ? `<div class="total-row"><span>${escapeHtml(labels.paidLabel)}</span><span>${escapeHtml(formatMoney(order.paidAmount))}</span></div>` : ""}
          ${show("balance_due") ? `<div class="total-row balance-due"><span>${escapeHtml(labels.balanceLabel)}</span><span>${escapeHtml(formatMoney(balance))}</span></div>` : ""}
          ${showCustomerBalance ? `<div class="total-row"><span>Customer balance</span><span>${escapeHtml(formatMoney(options?.customerBalance ?? "0"))}</span></div>` : ""}
          ${show("total") ? `<div class="total-row grand"><span>${escapeHtml(labels.totalLabel)}</span><span>${escapeHtml(formatMoney(order.totalAmount))}</span></div>` : ""}
        </div>
      </div>
    </div>`
        : ""
    }

    ${show("thank_you") ? `<div class="thank-you">${escapeHtml(labels.thankYouMessage)}</div>` : ""}

    ${
      show("footer")
        ? `<div class="footer">
      <div>
        <strong>${escapeHtml(companyName)}</strong>
        ${escapeHtml(company.email)} · ${escapeHtml(company.phone)}
      </div>
      <div style="text-align: right;">
        ${escapeHtml(labels.footerNote)}<br />
        ${escapeHtml(order.invoiceNumber)}
      </div>
    </div>`
        : ""
    }
  </div>
</body>
</html>`
}

export function resolveLogoSrc(company: CompanySettings): string {
  const logo = company.logoUrl.trim()
  if (logo.startsWith("data:") || logo.startsWith("http") || logo.startsWith("/")) {
    return logo || "/assets/logo-2.png"
  }
  return "/assets/logo-2.png"
}
