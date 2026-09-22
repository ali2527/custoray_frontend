"use client"

import Link from "next/link"
import { useTranslation } from "react-i18next"
import { ArrowUpRight } from "lucide-react"

import { useAuth } from "@/context/auth-context"
import { formatTrialEndDate } from "@/lib/subscription-access"

export function TrialBanner() {
  const { t } = useTranslation("plans")
  const { access } = useAuth()

  if (access?.status !== "TRIAL" || !access.trialEndsAt) return null

  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(access.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  )

  return (
    <div className="border-border/70 bg-background flex items-center gap-3 border-b px-4 py-2 lg:px-6">
      <span className="bg-primary/12 text-primary shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
        {t("banner.label")}
      </span>
      <p className="text-muted-foreground min-w-0 flex-1 truncate text-[13px]">
        <span className="text-foreground font-medium">{access.planName}</span>
        <span className="mx-1.5 text-border">·</span>
        {daysLeft === 0
          ? t("banner.lastDay")
          : t("banner.remaining", { count: daysLeft })}
        <span className="mx-1.5 text-border">·</span>
        {t("banner.ends", { date: formatTrialEndDate(access.trialEndsAt) })}
      </p>
      <Link
        href="/settings/billing"
        className="text-foreground hover:text-primary inline-flex shrink-0 items-center gap-0.5 text-[13px] font-medium"
      >
        {t("banner.viewPlans")}
        <ArrowUpRight className="size-3.5" aria-hidden />
      </Link>
    </div>
  )
}
