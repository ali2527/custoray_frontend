"use client"

import i18n from "@/i18n"
import { openConfirmDialog } from "@/lib/confirm-dialog"

type ConfirmActionOptions = {
  itemName?: string
  count?: number
  entityLabel?: string
  /** Extra warning shown under the normal delete copy (e.g. completed sales / stock). */
  warning?: string
}

type ConfirmReturnOptions = {
  scope: "item" | "invoice"
  itemName?: string
  referenceNumber?: string
  totalAmount?: string
  refundDue?: string
}

function entityLabel(label: string | undefined, count: number) {
  const base = label || i18n.t("confirm.entityDefaults.item")
  if (count === 1) return base
  return `${base}`
}

async function confirm(options: Parameters<typeof openConfirmDialog>[0]) {
  const result = await openConfirmDialog(options)
  return result.confirmed
}

export async function confirmDeleteAction({
  itemName,
  count,
  entityLabel: entity,
  warning,
}: ConfirmActionOptions): Promise<boolean> {
  const isBulk = count != null && count > 0
  const entityText = entityLabel(entity, isBulk ? count : 1)
  const title = isBulk
    ? i18n.t("confirm.delete.titleBulk", { count, entity: entityText })
    : i18n.t("confirm.delete.titleNamed", {
        name: itemName ?? entityText,
      })

  const base = isBulk
    ? i18n.t("confirm.delete.textBulk", { count, entity: entityText })
    : itemName
      ? i18n.t("confirm.delete.textNamed", { name: itemName })
      : i18n.t("confirm.delete.textGeneric")
  const description = warning ? `${base}\n\n${warning}` : base

  return confirm({
    title,
    description,
    confirmLabel: i18n.t("confirm.delete.confirm"),
    cancelLabel: i18n.t("confirm.cancel"),
    variant: "destructive",
    tone: "danger",
  })
}

export async function confirmCancelAction({
  itemName,
  count,
  entityLabel: entity,
}: ConfirmActionOptions): Promise<boolean> {
  const isBulk = count != null && count > 0
  const entityText = entityLabel(entity, isBulk ? count : 1)
  const title = isBulk
    ? i18n.t("confirm.cancelAction.titleBulk", { count, entity: entityText })
    : i18n.t("confirm.cancelAction.titleNamed", {
        name: itemName ?? entityText,
      })

  const description = isBulk
    ? i18n.t("confirm.cancelAction.textBulk", { entity: entityText })
    : itemName
      ? i18n.t("confirm.cancelAction.textNamed", { name: itemName })
      : i18n.t("confirm.cancelAction.textGeneric")

  return confirm({
    title,
    description,
    confirmLabel: i18n.t("confirm.cancelAction.confirm"),
    cancelLabel: i18n.t("confirm.cancelAction.keep"),
    variant: "destructive",
    tone: "danger",
  })
}

export async function confirmReturnAction({
  scope,
  itemName,
  referenceNumber,
  totalAmount,
  refundDue,
}: ConfirmReturnOptions): Promise<boolean> {
  const name =
    itemName ??
    (scope === "invoice"
      ? i18n.t("confirm.return.defaults.invoice")
      : i18n.t("confirm.return.defaults.item"))
  const title =
    scope === "invoice"
      ? i18n.t("confirm.return.titleInvoice", { name })
      : i18n.t("confirm.return.titleItem", { name })

  const parts: string[] = []
  if (scope === "item" && referenceNumber) {
    parts.push(i18n.t("confirm.return.fromInvoice", { reference: referenceNumber }))
  }
  if (scope === "invoice") {
    parts.push(i18n.t("confirm.return.allLineItems"))
  } else {
    parts.push(i18n.t("confirm.return.thisLineItem"))
  }
  if (totalAmount && Number(totalAmount) > 0) {
    parts.push(i18n.t("confirm.return.returnAmount", { amount: totalAmount }))
  }
  if (refundDue && Number(refundDue) > 0) {
    parts.push(i18n.t("confirm.return.refundDue", { amount: refundDue }))
  }
  parts.push(i18n.t("confirm.return.willUpdate"))

  return confirm({
    title,
    description: parts.join(" "),
    confirmLabel: i18n.t("confirm.return.confirm"),
    cancelLabel: i18n.t("confirm.cancel"),
    tone: "question",
  })
}

export async function confirmReturnLineAction({
  itemName,
  referenceNumber,
  unitPrice,
  maxQuantity,
}: {
  itemName: string
  referenceNumber: string
  unitPrice: string
  maxQuantity: number
}): Promise<number | null> {
  const maxQty = Math.max(1, maxQuantity)
  const allowQty = maxQty > 1
  const description = [
    i18n.t("confirm.return.fromInvoice", { reference: referenceNumber }),
    allowQty ? i18n.t("confirm.return.unitPrice", { price: unitPrice }) : null,
    i18n.t("confirm.return.willUpdate"),
  ]
    .filter(Boolean)
    .join(" ")

  const result = await openConfirmDialog({
    title: i18n.t("confirm.return.titleItem", { name: itemName }),
    description,
    confirmLabel: i18n.t("confirm.return.confirm"),
    cancelLabel: i18n.t("confirm.cancel"),
    tone: "question",
    input: allowQty
      ? {
          type: "number",
          min: 1,
          max: maxQty,
          defaultValue: 1,
          label: i18n.t("confirm.return.quantity"),
          hint: i18n.t("confirm.return.maxHint", { max: maxQty }),
          invalidMin: i18n.t("confirm.return.invalidMin"),
          invalidMax: i18n.t("confirm.return.invalidMax", { max: maxQty }),
        }
      : undefined,
  })

  if (!result.confirmed) return null
  if (!allowQty) return 1
  const qty = Math.min(maxQty, Math.max(1, Number(result.value) || 1))
  return Number.isFinite(qty) ? qty : 1
}

type ConfirmPosSaleOptions = {
  invoiceNumber: string
  totalAmount: string
  customerName: string
  status: string
}

export async function confirmPosSaleAction({
  invoiceNumber,
  totalAmount,
  customerName,
  status,
}: ConfirmPosSaleOptions): Promise<boolean> {
  return confirm({
    title: i18n.t("confirm.posSale.title", { invoiceNumber }),
    description: `${customerName} · ${totalAmount} · ${status}`,
    confirmLabel: i18n.t("confirm.posSale.confirm"),
    cancelLabel: i18n.t("confirm.cancel"),
    tone: "question",
  })
}

export async function confirmDuplicateAction({
  itemName,
  entityLabel: entity,
}: ConfirmActionOptions): Promise<boolean> {
  const entityText = entity || i18n.t("confirm.entityDefaults.item")
  const label = itemName ?? entityText
  return confirm({
    title: i18n.t("confirm.duplicate.title", { label }),
    description: itemName
      ? i18n.t("confirm.duplicate.textNamed", { name: itemName })
      : i18n.t("confirm.duplicate.textGeneric", { entity: entityText }),
    confirmLabel: i18n.t("confirm.duplicate.confirm"),
    cancelLabel: i18n.t("confirm.cancel"),
    tone: "question",
  })
}

export async function confirmSelectInvoiceTemplateAction({
  templateName,
}: {
  templateName: string
}): Promise<boolean> {
  return confirm({
    title: i18n.t("confirm.invoiceTemplate.title", { templateName }),
    description: i18n.t("confirm.invoiceTemplate.text", { templateName }),
    confirmLabel: i18n.t("confirm.invoiceTemplate.confirm"),
    cancelLabel: i18n.t("confirm.cancel"),
    tone: "question",
  })
}
