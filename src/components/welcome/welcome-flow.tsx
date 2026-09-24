"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { BadgeCheck } from "lucide-react"
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
import { MilestoneStepper } from "@/components/welcome/green-progress"
import {
  persistWelcomeCompany,
  useWelcomeCompanyDraft,
  WelcomeSetupBody,
  WELCOME_SETUP_STEPS,
} from "@/components/welcome/welcome-setup"
import { useAuth } from "@/context/auth-context"
import { apiPatchOnboarding } from "@/lib/api/auth"
import { TRIAL_DAYS } from "@/lib/plans"
import { markSetupMilestone } from "@/lib/setup-progress"
import { formatTrialEndDate } from "@/lib/subscription-access"
import {
  completeWelcomeFlow,
  dismissWelcomeFlow,
  isWelcomeFlowCompleted,
  isWelcomeFlowDismissed,
  isWelcomeFlowPending,
  pathMatches,
  queueWelcomeFlow,
  toAppPath,
  WELCOME_OPEN_EVENT,
} from "@/lib/welcome-flow"

export function WelcomeFlow() {
  const { t } = useTranslation("common")
  const { access, hydrated, isAuthenticated, user } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [setupStep, setSetupStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const { companyDraft, updateCompany } = useWelcomeCompanyDraft()

  const isOnTrial = access?.status === "TRIAL"
  const daysLeft = access?.trialEndsAt
    ? Math.max(
        0,
        Math.ceil((new Date(access.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      )
    : TRIAL_DAYS
  const firstName = user?.name?.trim().split(/\s+/)[0]
  const planName = access?.planName ?? "Starter"
  const trialEndLabel =
    isOnTrial && access?.trialEndsAt
      ? formatTrialEndDate(access.trialEndsAt)
      : null
  const isLastStep = setupStep === WELCOME_SETUP_STEPS - 1

  useEffect(() => {
    function onOpenRequest() {
      if (isWelcomeFlowCompleted()) return
      setSetupStep(0)
      setOpen(true)
    }
    window.addEventListener(WELCOME_OPEN_EVENT, onOpenRequest)
    return () => window.removeEventListener(WELCOME_OPEN_EVENT, onOpenRequest)
  }, [])

  useEffect(() => {
    if (!hydrated || !isAuthenticated || isWelcomeFlowCompleted()) return
    if (open) return
    if (typeof window !== "undefined") {
      const fromUrl = new URLSearchParams(window.location.search).get("welcome") === "1"
      if (fromUrl) queueWelcomeFlow()
    }
    if (isWelcomeFlowPending() || (isOnTrial && !isWelcomeFlowDismissed())) {
      setOpen(true)
      setSetupStep(0)
    }
  }, [hydrated, isAuthenticated, access?.status, open, isOnTrial])

  function finishSetup() {
    completeWelcomeFlow()
    setOpen(false)
    setSetupStep(0)
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      if (url.searchParams.has("welcome")) {
        url.searchParams.delete("welcome")
        const next = `${url.pathname}${url.search}${url.hash}`
        router.replace(next)
      }
    }
    if (!pathMatches(pathname, "/home")) {
      router.push(toAppPath("/home"))
    }
  }

  async function handleContinue() {
    if (setupStep === 0) {
      toast.success(t("welcome.milestones.welcome"))
      setSetupStep(1)
      return
    }

    if (setupStep === 1) {
      const name = companyDraft.name.trim()
      if (name.length < 2) {
        toast.error(t("welcome.guide.companyNameRequired"))
        return
      }
      setSaving(true)
      try {
        await persistWelcomeCompany({ ...companyDraft, name })
        void apiPatchOnboarding({ company: true }).catch(() => undefined)
        toast.success(t("welcome.milestones.company"))
        setSetupStep(2)
      } finally {
        setSaving(false)
      }
      return
    }

    if (setupStep === 2) {
      toast.success(t("welcome.milestones.term"))
      setSetupStep(3)
      return
    }

    markSetupMilestone("settings")
    void apiPatchOnboarding({ company: true }).catch(() => undefined)
    toast.success(t("welcome.milestones.appearance"))
    finishSetup()
  }

  function handleSkip() {
    dismissWelcomeFlow()
    setOpen(false)
    setSetupStep(0)
  }

  const setupTitle =
    setupStep === 1
      ? t("welcome.guide.companyTitle")
      : setupStep === 2
        ? t("welcome.guide.termTitle")
        : setupStep === 3
          ? t("welcome.guide.displayTitle")
          : firstName
            ? t("welcome.congratulationsName", { name: firstName })
            : t("welcome.congratulations")

  const setupDescription =
    setupStep === 3
      ? t("welcome.guide.displayBody")
      : setupStep === 2
        ? t("welcome.guide.termLead")
        : setupStep === 1
          ? t("welcome.guide.companyLead")
          : setupStep === 0
            ? t("welcome.workspaceReady")
            : null

  const milestoneSteps = [
    {
      id: "welcome",
      label: t("welcome.milestones.welcomeLabel"),
      done: setupStep > 0,
    },
    {
      id: "company",
      label: t("welcome.milestones.companyLabel"),
      done: setupStep > 1,
    },
    {
      id: "term",
      label: t("welcome.milestones.termLabel"),
      done: setupStep > 2,
    },
    {
      id: "look",
      label: t("welcome.milestones.lookLabel"),
      done: setupStep > 3,
    },
  ]

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-zinc-950/45"
        className="max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-2xl p-0 sm:max-w-[40rem] gap-0 font-sans [font-family:var(--font-poppins),ui-sans-serif,system-ui,sans-serif] [&_*]:[font-family:inherit]"
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <div className="relative">
          <div className="relative h-[7.75rem] overflow-hidden bg-gradient-to-b from-primary/45 via-primary/18 to-transparent">
            <div className="pointer-events-none absolute -top-10 left-1/2 size-52 -translate-x-1/2 rounded-full bg-primary/35 blur-3xl" />
            <div className="pointer-events-none absolute left-8 top-4 size-24 rounded-full bg-primary/20 blur-2xl" />
            <div className="pointer-events-none absolute right-10 top-2 size-16 rounded-full bg-primary/25 blur-xl" />
          </div>
          <div className="relative z-10 -mt-8 flex justify-center">
            <div className="flex size-[3.75rem] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_10px_28px_rgba(146,199,32,0.4)]">
              <BadgeCheck className="size-8" strokeWidth={1.75} aria-hidden />
            </div>
          </div>
        </div>

        <div className="px-8 pb-9 pt-6 sm:px-10 sm:pb-10 sm:pt-7">
          <DialogHeader className="gap-3 text-left sm:text-left">
            <MilestoneStepper steps={milestoneSteps} />
            <DialogTitle className="text-[1.5rem] leading-snug font-semibold tracking-tight sm:text-[1.625rem]">
              {setupTitle}
            </DialogTitle>
            {setupDescription ? (
              <DialogDescription className="max-w-[32rem] text-[13px] leading-relaxed">
                {setupDescription}
              </DialogDescription>
            ) : null}
          </DialogHeader>

          {setupStep === 0 ? (
            <>
              <p className="text-foreground/80 mt-3.5 max-w-[32rem] text-[13px] leading-relaxed">
                {isOnTrial
                  ? trialEndLabel
                    ? t("welcome.trialNoticeBody", {
                        plan: planName,
                        days: daysLeft,
                        date: trialEndLabel,
                      })
                    : t("welcome.trialBody", { days: daysLeft, total: TRIAL_DAYS })
                  : t("welcome.paidNoticeBody", { plan: planName })}
              </p>
              <dl
                className={
                  isOnTrial
                    ? "border-border/70 mt-7 grid grid-cols-3 gap-6 border-t pt-5 text-left"
                    : "border-border/70 mt-7 grid grid-cols-2 gap-6 border-t pt-5 text-left"
                }
              >
                <div>
                  <dt className="text-muted-foreground text-[10px] font-medium tracking-[0.12em] uppercase">
                    {t("welcome.summaryPlan")}
                  </dt>
                  <dd className="mt-1 text-[13px] font-medium">{planName}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-[10px] font-medium tracking-[0.12em] uppercase">
                    {t("welcome.summaryAccess")}
                  </dt>
                  <dd className="mt-1 text-[13px] font-medium">
                    {isOnTrial
                      ? t("welcome.trialBadge", { days: daysLeft })
                      : t("welcome.accessFull")}
                  </dd>
                </div>
                {isOnTrial ? (
                  <div>
                    <dt className="text-muted-foreground text-[10px] font-medium tracking-[0.12em] uppercase">
                      {t("welcome.summaryEnds")}
                    </dt>
                    <dd className="mt-1 text-[13px] font-medium">
                      {trialEndLabel ?? "—"}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </>
          ) : null}

          {setupStep >= 1 ? (
            <div className="mt-4">
              <WelcomeSetupBody
                step={setupStep}
                companyDraft={companyDraft}
                onCompanyChange={updateCompany}
              />
            </div>
          ) : null}

          <div className="mt-7 flex flex-wrap items-center gap-2">
            {setupStep > 0 ? (
              <Button
                type="button"
                variant="ghost"
                className="text-muted-foreground h-9 px-4 text-[13px]"
                onClick={() => setSetupStep((prev) => prev - 1)}
                disabled={saving}
              >
                {t("welcome.back")}
              </Button>
            ) : null}
            <Button
              type="button"
              className="h-9 px-6 text-[13px]"
              onClick={() => void handleContinue()}
              disabled={saving}
            >
              {setupStep === 0
                ? t("welcome.letsGetStarted")
                : isLastStep
                  ? t("welcome.getStarted")
                  : t("welcome.continue")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground h-9 px-4 text-[13px]"
              onClick={handleSkip}
              disabled={saving}
            >
              {t("welcome.skipForNow")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
