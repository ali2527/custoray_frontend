"use client"

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"

import {
  formatMoney,
  type CustomerRecord,
  type CustomerRecordInvoice,
  type CustomerRecordMonth,
  type CustomerRecordReturnDoc,
} from "@/lib/customer-record"
import type { CompanySettings } from "@/lib/company-settings"
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
  type InvoiceTemplateId,
} from "@/lib/invoice-templates"
import { cn } from "@/lib/utils"

const A4_WIDTH = 794

function credit(amount: string) {
  return `(${formatMoney(amount)})`
}

function LineTable({
  lines,
  asCredit,
  tableHeadBg,
  tableHeadText,
}: {
  lines: { productName: string; quantity: number; unitPrice: string; lineTotal: string }[]
  asCredit?: boolean
  tableHeadBg: string
  tableHeadText: string
}) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          {["Description", "Qty", "Unit Price", "Amount"].map((label, i) => (
            <th
              key={label}
              style={{
                background: tableHeadBg,
                color: tableHeadText,
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontWeight: 600,
                padding: "8px 12px",
                textAlign: i === 0 ? "left" : "right",
              }}
            >
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {lines.map((line, index) => (
          <tr key={`${line.productName}-${index}`} style={{ background: index % 2 ? "#fafafa" : "#fff" }}>
            <td style={{ padding: "8px 12px", borderBottom: "1px solid #f3f4f6" }}>{line.productName}</td>
            <td
              style={{
                padding: "8px 12px",
                borderBottom: "1px solid #f3f4f6",
                textAlign: "right",
                whiteSpace: "nowrap",
              }}
            >
              {line.quantity}
            </td>
            <td
              style={{
                padding: "8px 12px",
                borderBottom: "1px solid #f3f4f6",
                textAlign: "right",
                whiteSpace: "nowrap",
              }}
            >
              {formatMoney(line.unitPrice)}
            </td>
            <td
              style={{
                padding: "8px 12px",
                borderBottom: "1px solid #f3f4f6",
                textAlign: "right",
                whiteSpace: "nowrap",
                fontWeight: 700,
                color: asCredit ? "#b91c1c" : "#111827",
              }}
            >
              {asCredit ? credit(line.lineTotal) : formatMoney(line.lineTotal)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function InvoiceBlock({
  invoice,
  border,
  tableHeadBg,
  tableHeadText,
  display,
}: {
  invoice: CustomerRecordInvoice
  border: string
  tableHeadBg: string
  tableHeadText: string
  display: DocumentDisplayFlags
}) {
  const lines = filterDocumentLines(invoice.lines, display)
  return (
    <div style={{ margin: "12px 0", border: `1px solid ${border}`, borderRadius: 10, overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          padding: "8px 12px",
          background: "#f9fafb",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        <span>{invoice.invoiceNumber}</span>
        <span style={{ color: "#6b7280", fontWeight: 600 }}>{formatDate(invoice.orderDate)}</span>
      </div>
      {lines.length > 0 ? (
        <LineTable lines={lines} tableHeadBg={tableHeadBg} tableHeadText={tableHeadText} />
      ) : null}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "8px 12px",
          fontSize: 12,
          fontWeight: 700,
          background: "#f9fafb",
          borderTop: `1px solid ${border}`,
        }}
      >
        <span>Invoice total</span>
        <span>{formatMoney(invoice.totalAmount)}</span>
      </div>
    </div>
  )
}

function ReturnBlock({
  doc,
  tableHeadBg,
  tableHeadText,
  display,
}: {
  doc: CustomerRecordReturnDoc
  tableHeadBg: string
  tableHeadText: string
  display: DocumentDisplayFlags
}) {
  const linked = doc.referenceNumber && doc.referenceNumber !== "—" ? ` · return of ${doc.referenceNumber}` : ""
  const lines = filterDocumentLines(doc.lines, display)
  return (
    <div style={{ margin: "12px 0", border: "1px solid #fecaca", borderRadius: 10, overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          padding: "8px 12px",
          background: "#fef2f2",
          color: "#991b1b",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        <span>
          {doc.returnNumber}
          {linked}
        </span>
        <span style={{ color: "#b91c1c", fontWeight: 600 }}>{formatDate(doc.returnDate)}</span>
      </div>
      {lines.length > 0 ? (
        <LineTable lines={lines} asCredit tableHeadBg={tableHeadBg} tableHeadText={tableHeadText} />
      ) : null}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "8px 12px",
          fontSize: 12,
          fontWeight: 700,
          background: "#f9fafb",
          borderTop: "1px solid #fecaca",
        }}
      >
        <span>Return total</span>
        <span style={{ color: "#b91c1c" }}>{credit(doc.totalAmount)}</span>
      </div>
    </div>
  )
}

function BalanceRow({
  label,
  value,
  closing,
  billToBg,
  border,
  grandBg,
  grandText,
}: {
  label: string
  value: ReactNode
  closing?: boolean
  billToBg: string
  border: string
  grandBg: string
  grandText: string
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 12px",
        fontSize: 12,
        border: `1px solid ${border}`,
        borderRadius: 8,
        margin: "8px 0",
        background: closing ? grandBg : billToBg,
      }}
    >
      <span style={{ color: closing ? grandText : "#6b7280", fontWeight: 600 }}>{label}</span>
      <span style={{ fontWeight: 700, color: closing ? grandText : "#111827" }}>{value}</span>
    </div>
  )
}

function MonthSection({
  month,
  template,
  display,
}: {
  month: CustomerRecordMonth
  template: ReturnType<typeof resolveInvoiceTemplate>
  display: DocumentDisplayFlags
}) {
  return (
    <section style={{ marginBottom: 22 }}>
      <h2
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: "#111827",
          paddingBottom: 8,
          marginBottom: 8,
          borderBottom: `2px solid ${template.accent}`,
        }}
      >
        {month.title}
      </h2>
      {display.showCustomerBalance ? (
        <BalanceRow
          label="Opening balance"
          value={formatMoney(month.opening)}
          billToBg={template.billToBg}
          border={template.billToBorder}
          grandBg={template.grandTotalBg}
          grandText={template.grandTotalText}
        />
      ) : null}
      {month.invoices.map((invoice) => (
        <InvoiceBlock
          key={invoice.id}
          invoice={invoice}
          border={template.billToBorder}
          tableHeadBg={template.tableHeadBg}
          tableHeadText={template.tableHeadText}
          display={display}
        />
      ))}
      {month.returns.map((doc) => (
        <ReturnBlock
          key={doc.id}
          doc={doc}
          tableHeadBg={template.tableHeadBg}
          tableHeadText={template.tableHeadText}
          display={display}
        />
      ))}
      {display.showCustomerBalance ? (
        <BalanceRow
          label="Closing balance"
          value={formatMoney(month.closing)}
          closing
          billToBg={template.billToBg}
          border={template.billToBorder}
          grandBg={template.grandTotalBg}
          grandText={template.grandTotalText}
        />
      ) : null}
    </section>
  )
}

type CustomerRecordPreviewProps = {
  record: CustomerRecord
  company: CompanySettings
  templateId?: InvoiceTemplateId
  colors?: InvoiceTemplateColorOverrides
  builder?: InvoiceBuilderConfig
  display?: DocumentDisplayFlags
  logoUrl?: string
  className?: string
  previewWidth?: number
}

export function CustomerRecordPreview({
  record,
  company,
  templateId = "classic",
  colors,
  builder,
  display = DEFAULT_DOCUMENT_DISPLAY_FLAGS,
  logoUrl,
  className,
  previewWidth = 680,
}: CustomerRecordPreviewProps) {
  const template = resolveInvoiceTemplate(templateId, colors)
  const config = builder ?? defaultInvoiceBuilderConfig()
  const pageRef = useRef<HTMLDivElement>(null)
  const [pageHeight, setPageHeight] = useState(1123)
  const scale = previewWidth / A4_WIDTH
  const headerOnPanel = Boolean(template.headerPanel)
  const headerText = headerOnPanel ? template.headerText : "#111827"
  const headerSub = headerOnPanel ? "rgba(255,255,255,0.82)" : "#6b7280"
  const companyMetaColor = headerOnPanel ? "rgba(255,255,255,0.75)" : "#4b5563"

  const companyName = config.companyNameOverride.trim() || company.name
  const companyTagline = config.companyTaglineOverride.trim()
  const companyAddress = config.companyAddressOverride.trim() || `${company.addressLine1}\n${company.addressLine2}`
  const companyContact = config.companyContactOverride.trim() || `${company.phone} · ${company.email}`
  const logo = config.logoUrlOverride.trim().startsWith("data:")
    ? config.logoUrlOverride.trim()
    : logoUrl?.trim() || ""

  useEffect(() => {
    const el = pageRef.current
    if (!el) return
    const update = () => setPageHeight(el.scrollHeight)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [record, display])

  const pageStyle: CSSProperties = {
    width: A4_WIDTH,
    transform: `scale(${scale})`,
    transformOrigin: "top left",
    backgroundColor: "#ffffff",
    color: "#1a1a1a",
    fontFamily: template.fontFamily,
    fontSize: 12.5,
    lineHeight: 1.5,
    padding: "40px 48px 48px",
    boxSizing: "border-box",
  }

  return (
    <div
      className={cn("relative shrink-0 overflow-hidden rounded-md border border-[#e5e7eb] bg-white shadow-md", className)}
      style={{ width: previewWidth, height: pageHeight * scale }}
    >
      <div ref={pageRef} style={pageStyle}>
        {template.showAccentBar ? (
          <div
            style={{
              height: 6,
              borderRadius: 999,
              marginBottom: 22,
              background: `linear-gradient(90deg, ${template.accent}, ${template.accent}cc)`,
            }}
          />
        ) : null}

        <div
          style={{
            background: headerOnPanel ? template.headerBg : "transparent",
            margin: headerOnPanel ? "0 -48px 22px" : "0 0 22px",
            padding: headerOnPanel ? "22px 48px 18px" : 0,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, maxWidth: "58%", minWidth: 0 }}>
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt="" style={{ width: 64, height: 64, objectFit: "contain", flexShrink: 0 }} />
              ) : null}
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: headerText, letterSpacing: "-0.02em" }}>
                  {companyName}
                </div>
                <div style={{ color: headerSub, fontSize: 12, marginTop: 2 }}>{companyTagline}</div>
                <div
                  style={{
                    color: companyMetaColor,
                    fontSize: 11,
                    marginTop: 8,
                    lineHeight: 1.6,
                    whiteSpace: "pre-line",
                  }}
                >
                  {companyAddress}
                  {"\n"}
                  {companyContact}
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right", minWidth: 210 }}>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: template.accent,
                  fontWeight: 700,
                  marginBottom: 4,
                }}
              >
                Customer Record
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: headerText }}>
                As of {formatDate(record.asOf)}
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: headerOnPanel ? "rgba(255,255,255,0.7)" : "#6b7280" }}>
                Customer ID <span style={{ fontWeight: 600, color: headerText }}>#{record.customer.id}</span>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            background: template.billToBg,
            border: `1px solid ${template.billToBorder}`,
            borderRadius: 12,
            padding: "14px 16px",
            marginBottom: 22,
          }}
        >
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: template.accent,
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            Customer
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{record.customer.name}</div>
          {record.customer.phone && record.customer.phone !== "—" ? (
            <div style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>{record.customer.phone}</div>
          ) : null}
          {record.customer.description && record.customer.description !== "—" ? (
            <div style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>{record.customer.description}</div>
          ) : null}
        </div>

        {record.months.length === 0 ? (
          <p style={{ color: "#6b7280", fontSize: 13, padding: "18px 8px", textAlign: "center" }}>
            No invoices or returns through {formatDate(record.asOf)}.
          </p>
        ) : (
          record.months.map((month) => (
            <MonthSection
              key={month.yearMonth}
              month={month}
              template={template}
              display={display}
            />
          ))
        )}

        <div
          style={{
            marginTop: 8,
            border: `1px solid ${template.billToBorder}`,
            borderRadius: 12,
            overflow: "hidden",
            width: 320,
            marginLeft: "auto",
          }}
        >
          <div
            style={{
              padding: "10px 16px",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontWeight: 700,
              color: template.accent,
              background: template.billToBg,
            }}
          >
            Final total
          </div>
          {[
            ...(display.showCustomerBalance
              ? [{ label: "Opening balance", value: formatMoney(record.totals.opening), isCredit: false }]
              : []),
            { label: "Total invoices", value: formatMoney(record.totals.invoiceTotal), isCredit: false },
            { label: "Total returns", value: credit(record.totals.returnTotal), isCredit: true },
          ].map((row) => (
            <div
              key={row.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "9px 16px",
                fontSize: 12,
                borderTop: "1px solid #f3f4f6",
              }}
            >
              <span style={{ color: "#6b7280" }}>{row.label}</span>
              <span style={{ fontWeight: 600, color: row.isCredit ? "#b91c1c" : "#111827" }}>{row.value}</span>
            </div>
          ))}
          {display.showCustomerBalance ? (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "9px 16px",
                fontSize: 12,
                background: template.grandTotalBg,
                color: template.grandTotalText,
                fontWeight: 700,
              }}
            >
              <span>Closing balance</span>
              <span>{formatMoney(record.totals.closing)}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
