"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { IconHistory, IconPhone, IconTruck } from "@tabler/icons-react"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { VendorPurchaseCards } from "@/components/vendors/vendor-purchase-cards"
import {
  computeBalance,
  formatMoney,
  statusBadgeClass,
  vendorTimelineHref,
  type VendorRow,
} from "@/lib/vendors"

function ViewDetail({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="bg-muted/20 flex flex-col gap-1 rounded-lg border px-3 py-2.5">
      <dt className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
        {label}
      </dt>
      <dd className="text-foreground min-w-0 text-sm font-medium">{children}</dd>
    </div>
  )
}

function moneyTone(value: string) {
  const n = Number(value)
  if (!Number.isFinite(n) || n === 0) return "text-foreground"
  if (n > 0) return "text-orange-600 dark:text-orange-400"
  return "text-emerald-700 dark:text-emerald-400"
}

function phoneHref(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "")
  return digits.length >= 7 ? `tel:${digits}` : null
}

type VendorDetailProps = {
  vendor: VendorRow
  onViewTimeline?: () => void
}

export function VendorDetail({ vendor, onViewTimeline }: VendorDetailProps) {
  const { t } = useTranslation("vendors")
  const photo = vendor.imageUrl.trim()
  const phone = vendor.phone.trim() === "—" ? "" : vendor.phone.trim()
  const description =
    vendor.description.trim() === "—" ? "" : vendor.description.trim()
  const balance = computeBalance(vendor)
  const balanceNum = Number(balance)
  const callHref = phone ? phoneHref(phone) : null
  const balanceLabel =
    balanceNum > 0
      ? t("viewSheet.outstanding")
      : balanceNum < 0
        ? t("viewSheet.credit")
        : t("viewSheet.settled")

  return (
    <div className="flex flex-col gap-5">
      {photo ? (
        <div className="bg-muted aspect-[16/9] overflow-hidden rounded-xl border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo}
            alt={vendor.name}
            className="size-full object-cover"
          />
        </div>
      ) : (
        <div
          className="bg-muted/40 text-muted-foreground mx-auto flex size-28 flex-col items-center justify-center rounded-2xl border border-dashed"
          aria-label={t("viewSheet.noPhoto")}
        >
          <IconTruck className="size-10 opacity-70" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className="font-mono text-xs">
          {t("viewSheet.idLabel", { id: vendor.id })}
        </Badge>
        <Badge variant="outline" className={statusBadgeClass(vendor.status)}>
          {t(`status.${vendor.status}`, { ns: "common" })}
        </Badge>
        {phone ? (
          callHref ? (
            <a href={callHref}>
              <Badge variant="outline" className="text-muted-foreground gap-1">
                <IconPhone className="size-3" />
                {phone}
              </Badge>
            </a>
          ) : (
            <Badge variant="outline" className="text-muted-foreground gap-1">
              <IconPhone className="size-3" />
              {phone}
            </Badge>
          )
        ) : null}
      </div>

      {description ? (
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      ) : null}

      <div>
        <h3 className="mb-2 text-sm font-semibold tracking-tight">
          {t("viewSheet.account")}
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border px-3 py-3">
            <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              {t("columns.openingBalance")}
            </p>
            <p className="mt-1 text-sm font-semibold tabular-nums">
              {formatMoney(vendor.openingBalance)}
            </p>
          </div>
          <div className="rounded-xl border px-3 py-3">
            <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              {t("columns.totalPurchases")}
            </p>
            <p className="mt-1 text-sm font-semibold tabular-nums">
              {formatMoney(vendor.totalPurchases)}
            </p>
          </div>
          <div className="rounded-xl border px-3 py-3">
            <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              {t("columns.totalPayments")}
            </p>
            <p className="mt-1 text-sm font-semibold tabular-nums">
              {formatMoney(vendor.totalPayments)}
            </p>
          </div>
          <div className="rounded-xl border px-3 py-3">
            <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              {balanceLabel}
            </p>
            <p className={`mt-1 text-sm font-semibold tabular-nums ${moneyTone(balance)}`}>
              {formatMoney(balance)}
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold tracking-tight">
          {t("viewSheet.details")}
        </h3>
        <dl className="grid grid-cols-2 gap-2">
          <ViewDetail label={t("columns.id")}>
            <span className="font-mono tabular-nums">{vendor.id}</span>
          </ViewDetail>
          <ViewDetail label={t("fields.status")}>
            {t(`status.${vendor.status}`, { ns: "common" })}
          </ViewDetail>
          <ViewDetail label={t("fields.phone")}>{phone || "—"}</ViewDetail>
        </dl>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold tracking-tight">
            {t("viewSheet.recent")}
          </h3>
          {onViewTimeline ? (
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground text-xs font-medium underline-offset-4 hover:underline"
              onClick={onViewTimeline}
            >
              {t("viewSheet.viewAll")}
            </button>
          ) : (
            <Link
              href={vendorTimelineHref(vendor.apiId || vendor.id)}
              className="text-muted-foreground hover:text-foreground text-xs font-medium underline-offset-4 hover:underline"
            >
              {t("viewSheet.viewAll")}
            </Link>
          )}
        </div>
        <VendorPurchaseCards vendor={vendor} limit={3} compact />
      </div>

      {onViewTimeline ? (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={onViewTimeline}
        >
          <IconHistory className="size-4" />
          {t("actions.viewTimeline")}
        </Button>
      ) : null}
    </div>
  )
}
