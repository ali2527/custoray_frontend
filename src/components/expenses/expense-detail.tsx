"use client"

import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import {
  formatDate,
  formatMoney,
  statusBadgeClass,
  type ExpenseRow,
} from "@/lib/expenses"

function detailRow(label: string, value: ReactNode) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground min-w-0 font-medium">{value}</dd>
    </div>
  )
}

export function ExpenseDetail({ expense }: { expense: ExpenseRow }) {
  const { t } = useTranslation("expenses")
  return (
    <div className="flex flex-col gap-4">
      <div className="min-w-0">
        <p className="text-foreground text-base font-semibold">{expense.expenseNumber}</p>
        <p className="text-muted-foreground text-xs">
          {t("detail.idDate", {
            id: expense.id,
            date: formatDate(expense.expenseDate),
          })}
        </p>
      </div>
      <dl className="space-y-3">
        {detailRow(t("detail.type"), expense.typeName)}
        {detailRow(t("detail.expenseDate"), formatDate(expense.expenseDate))}
        {detailRow(t("detail.amount"), formatMoney(expense.amount))}
        {detailRow(t("detail.paymentMethod"), expense.paymentMethod)}
        {detailRow(
          t("detail.status"),
          <Badge variant="outline" className={statusBadgeClass(expense.status)}>
            {t(`tabs.${expense.status}`)}
          </Badge>
        )}
        {detailRow(t("detail.notes"), expense.notes)}
      </dl>
    </div>
  )
}
