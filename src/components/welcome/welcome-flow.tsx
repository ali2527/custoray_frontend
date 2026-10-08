"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ArrowRight, Check } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  persistWelcomeCompany,
  useWelcomeCompanyDraft,
  WelcomeSetupBody,
} from "@/components/welcome/welcome-setup"
import { useAuth } from "@/context/auth-context"
import { apiPatchOnboarding } from "@/lib/api/auth"
import { markSetupMilestone } from "@/lib/setup-progress"
import {
  completeWelcomeFlow,
  dismissWelcomeFlow,
  isWelcomeFlowCompleted,
  isWelcomeFlowDismissed,
  isWelcomeFlowPending,
  pathMatches,
  queueWelcomeFlow,
  readWelcomeSetupStep,
  saveWelcomeSetupStep,
  toAppPath,
  WELCOME_OPEN_EVENT,
  type WelcomeSetupStep,
} from "@/lib/welcome-flow"
import { cn } from "@/lib/utils"

const NAV = [
  { id: "business", step: 1 as const, labelKey: "businessNav", hintKey: "businessNavHint" },
  { id: "preferences", step: 2 as const, labelKey: "preferencesNav", hintKey: "preferencesNavHint" },
  { id: "invoices", step: 3 as const, labelKey: "invoicesNav", hintKey: "invoicesNavHint" },
] as const

export function WelcomeFlow() {
  const { t } = useTranslation("common")
  const { hydrated, isAuthenticated, activeCompany } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [setupStep, setSetupStep] = useState<WelcomeSetupStep>(0)
  const [saving, setSaving] = useState(false)
  const { companyDraft, updateCompany, hydrated: draftHydrated } =
    useWelcomeCompanyDraft()
  const { user } = useAuth()

  useEffect(() => {
    function onOpenRequest() {
      if (isWelcomeFlowCompleted()) return
      setSetupStep(readWelcomeSetupStep())
      setOpen(true)
    }
    window.addEventListener(WELCOME_OPEN_EVENT, onOpenRequest)
    return () => window.removeEventListener(WELCOME_OPEN_EVENT, onOpenRequest)
  }, [])

  useEffect(() => {
    if (!hydrated || !isAuthenticated) return
    if (isWelcomeFlowCompleted() || isWelcomeFlowDismissed()) return
    if (open) return
    if (typeof window !== "undefined") {
      const fromUrl = new URLSearchParams(window.location.search).get("welcome") === "1"
      if (fromUrl) queueWelcomeFlow()
    }
    if (isWelcomeFlowPending()) {
      setSetupStep(readWelcomeSetupStep())
      setOpen(true)
    }
  }, [hydrated, isAuthenticated, open])

  function clearWelcomeQuery() {
    if (typeof window === "undefined") return
    const url = new URL(window.location.href)
    if (!url.searchParams.has("welcome")) return
    url.searchParams.delete("welcome")
    router.replace(`${url.pathname}${url.search}${url.hash}`)
  }

  function goToStep(step: WelcomeSetupStep) {
    setSetupStep(step)
    saveWelcomeSetupStep(step)
  }

  function finishSetup() {
    completeWelcomeFlow()
    setOpen(false)
    goToStep(0)
    clearWelcomeQuery()
    if (!pathMatches(pathname, "/home")) {
      router.push(toAppPath("/home"))
    }
  }

  async function handleContinue() {
    if (setupStep === 0) {
      goToStep(1)
      return
    }

    if (setupStep === 1) {
      const name = companyDraft.name.trim()
      if (name.length < 2) {
        toast.error(t("welcome.onboarding.businessNameRequired"))
        return
      }
      setSaving(true)
      try {
        await persistWelcomeCompany({ ...companyDraft, name })
        void apiPatchOnboarding({ business: true }).catch(() => undefined)
        goToStep(2)
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : t("welcome.onboarding.saveFailed")
        )
      } finally {
        setSaving(false)
      }
      return
    }

    if (setupStep === 2) {
      setSaving(true)
      try {
        await persistWelcomeCompany(companyDraft)
        void apiPatchOnboarding({ preferences: true }).catch(() => undefined)
        goToStep(3)
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : t("welcome.onboarding.saveFailed")
        )
      } finally {
        setSaving(false)
      }
      return
    }

    if (setupStep === 3) {
      setSaving(true)
      try {
        await persistWelcomeCompany(companyDraft)
        void apiPatchOnboarding(
          { business: true, preferences: true, invoices: true },
          true
        ).catch(() => undefined)
        markSetupMilestone("settings")
        goToStep(4)
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : t("welcome.onboarding.saveFailed")
        )
      } finally {
        setSaving(false)
      }
      return
    }

    finishSetup()
  }

  function handleSkip() {
    dismissWelcomeFlow()
    clearWelcomeQuery()
    setOpen(false)
    toast.message(t("welcome.skipResumeHint"))
  }

  const businessName =
    companyDraft.name.trim() || activeCompany?.name?.trim() || "your business"

  const title =
    setupStep === 0
      ? t("welcome.onboarding.welcomeTitle")
      : setupStep === 1
        ? t("welcome.onboarding.businessTitle")
        : setupStep === 2
          ? t("welcome.onboarding.regionalTitle")
          : setupStep === 3
            ? t("welcome.onboarding.invoiceTitle")
            : t("welcome.onboarding.completeTitle")

  const description =
    setupStep === 0
      ? t("welcome.onboarding.welcomeBody", { business: businessName })
      : setupStep === 1
        ? t("welcome.onboarding.businessSubtitle")
        : setupStep === 2
          ? t("welcome.onboarding.regionalSubtitle")
          : setupStep === 3
            ? t("welcome.onboarding.invoiceSubtitle")
            : t("welcome.onboarding.completeSubtitle")

  const primaryLabel =
    setupStep === 0
      ? t("welcome.letsGetStarted")
      : setupStep === 4
        ? t("welcome.onboarding.goDashboard")
        : t("welcome.continue")

  const setupIndex = setupStep >= 1 && setupStep <= 3 ? setupStep : null

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-zinc-950/45"
        className="max-h-[92vh] w-full max-w-[calc(100%-1.5rem)] overflow-hidden rounded-2xl p-0 sm:max-w-[56rem] gap-0 font-sans [font-family:var(--font-poppins),ui-sans-serif,system-ui,sans-serif] [&_*]:[font-family:inherit]"
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <div className="grid max-h-[92vh] md:grid-cols-[15.5rem_1fr]">
          <aside className="border-border/70 hidden flex-col border-e bg-[#f6f7f4] px-5 py-6 md:flex dark:bg-zinc-950/40">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              Custoray
            </p>
            <h2 className="mt-3 text-lg font-semibold tracking-tight">
              {t("welcome.onboarding.sidebarTitle")}
            </h2>
            <p className="text-muted-foreground mt-1 text-[12px] leading-relaxed">
              {t("welcome.onboarding.timeHint")}
            </p>
            <ol className="mt-8 space-y-4">
              {NAV.map((item) => {
                const done = setupStep > item.step || setupStep === 4
                const current = setupStep === item.step
                return (
                  <li key={item.id} className="flex gap-3">
                    <span
                      className={cn(
                        "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                        done
                          ? "bg-primary text-primary-foreground"
                          : current
                            ? "bg-primary/15 text-primary ring-1 ring-primary/40"
                            : "bg-muted text-muted-foreground"
                      )}
                    >
                      {done ? <Check className="size-3.5" strokeWidth={3} /> : item.step}
                    </span>
                    <div>
                      <p
                        className={cn(
                          "text-[13px] font-medium",
                          current || done ? "text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {t(`welcome.onboarding.${item.labelKey}`)}
                      </p>
                      <p className="text-muted-foreground text-[11px] leading-snug">
                        {t(`welcome.onboarding.${item.hintKey}`)}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ol>
            <p className="text-muted-foreground mt-auto pt-8 text-[11px] leading-relaxed">
              {t("welcome.onboarding.changeAnytime")}
            </p>
          </aside>

          <div className="flex max-h-[92vh] flex-col overflow-hidden">
            <div className="border-border/60 flex items-center justify-between border-b px-5 py-3 md:hidden">
              <p className="text-xs font-medium">
                {setupIndex
                  ? t("welcome.onboarding.mobileProgress", {
                      current: setupIndex,
                      total: 3,
                    })
                  : "Custoray"}
              </p>
              <p className="text-muted-foreground text-[11px]">
                {t("welcome.onboarding.timeHint")}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-8 sm:py-7">
              <DialogHeader className="gap-2 text-left sm:text-left">
                {setupStep >= 1 && setupStep <= 3 ? (
                  <p className="text-muted-foreground text-[11px] font-medium tracking-wide">
                    Business / Preferences / Invoices
                  </p>
                ) : null}
                <DialogTitle className="text-[1.45rem] leading-snug font-semibold tracking-tight sm:text-[1.6rem]">
                  {title}
                </DialogTitle>
                <DialogDescription className="max-w-[36rem] text-[13px] leading-relaxed">
                  {description}
                </DialogDescription>
              </DialogHeader>

              {setupStep === 0 ? (
                <div className="mt-7 grid gap-3 sm:grid-cols-3">
                  {NAV.map((item) => (
                    <div
                      key={item.id}
                      className="border-border/80 rounded-xl border bg-background px-3.5 py-3"
                    >
                      <p className="text-[13px] font-semibold">
                        {t(`welcome.onboarding.${item.labelKey}`)}
                      </p>
                      <p className="text-muted-foreground mt-1 text-[11px] leading-snug">
                        {t(`welcome.onboarding.${item.hintKey}`)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}

              {setupStep >= 1 && draftHydrated ? (
                <div className="mt-5">
                  <WelcomeSetupBody
                    step={setupStep}
                    companyDraft={companyDraft}
                    onCompanyChange={updateCompany}
                    accountEmail={user?.email}
                  />
                </div>
              ) : null}
            </div>

            <div className="border-border/70 flex flex-wrap items-center justify-between gap-2 border-t px-5 py-4 sm:px-8">
              <div className="flex items-center gap-2">
                {setupStep > 0 && setupStep < 4 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-10"
                    onClick={() => goToStep((setupStep - 1) as WelcomeSetupStep)}
                    disabled={saving}
                  >
                    {t("welcome.back")}
                  </Button>
                ) : null}
                {setupStep < 4 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-muted-foreground h-10"
                    onClick={handleSkip}
                    disabled={saving}
                  >
                    {t("welcome.skipForNow")}
                  </Button>
                ) : null}
              </div>
              <Button
                type="button"
                className="h-10 rounded-xl px-5 shadow-none"
                onClick={() => void handleContinue()}
                disabled={saving || (setupStep >= 1 && !draftHydrated)}
              >
                {primaryLabel}
                <ArrowRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
