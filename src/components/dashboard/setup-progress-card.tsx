"use client"

import * as React from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { GreenTrack, MilestoneStepper } from "@/components/welcome/green-progress"
import {
  loadSetupProgress,
  setupCompletedCount,
  type SetupProgress,
} from "@/lib/setup-progress"
import { requestWelcomeFlow } from "@/lib/welcome-flow"
import { cn } from "@/lib/utils"

const panelClass =
  "rounded-2xl bg-card shadow-sm shadow-black/[0.03] ring-1 ring-border/50"

export function SetupProgressCard() {
  const { t } = useTranslation("common")
  const [progress, setProgress] = React.useState<SetupProgress>(() => loadSetupProgress())

  React.useEffect(() => {
    function refresh() {
      setProgress(loadSetupProgress())
    }
    window.addEventListener("custoray-setup-progress", refresh)
    window.addEventListener("storage", refresh)
    return () => {
      window.removeEventListener("custoray-setup-progress", refresh)
      window.removeEventListener("storage", refresh)
    }
  }, [])

  const completed = setupCompletedCount(progress)
  const total = 4
  if (completed >= total) return null

  const steps = [
    {
      id: "settings",
      label: t("dashboard.setup.settings"),
      hint: progress.settings ? t("dashboard.setup.completed") : undefined,
      done: progress.settings,
    },
    {
      id: "product",
      label: t("dashboard.setup.product"),
      done: progress.product,
    },
    {
      id: "customer",
      label: t("dashboard.setup.customer"),
      done: progress.customer,
    },
    {
      id: "invoice",
      label: t("dashboard.setup.invoice"),
      done: progress.invoice,
    },
  ]

  return (
    <div className={cn(panelClass, "px-5 py-5 sm:px-6")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold tracking-tight">
            {t("dashboard.setup.title")}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {t("dashboard.setup.hint")}
          </p>
        </div>
        {!progress.settings ? (
          <div className="flex items-center gap-2">
            <Button size="sm" className="h-8" onClick={() => requestWelcomeFlow()}>
              {t("dashboard.setup.start")}
            </Button>
          </div>
        ) : null}
      </div>
      <div className="mt-4">
        <GreenTrack
          completed={completed}
          total={total}
          label={t("dashboard.setup.completedOf", { completed, total })}
          percentLabel={`${Math.round((completed / total) * 100)}%`}
        />
      </div>
      <div className="mt-5">
        <MilestoneStepper steps={steps} />
      </div>
      {progress.settings && !progress.product ? (
        <div className="mt-5 flex justify-end">
          <Button size="sm" variant="outline" className="h-8" asChild>
            <Link href="/inventory/products">{t("dashboard.setup.addProduct")}</Link>
          </Button>
        </div>
      ) : null}
    </div>
  )
}
