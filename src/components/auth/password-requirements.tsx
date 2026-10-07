"use client"

import { Check } from "lucide-react"
import { useTranslation } from "react-i18next"

import {
  getPasswordRuleResults,
  type PasswordRuleId,
} from "@/lib/password"
import { cn } from "@/lib/utils"

const VISIBLE_RULES: PasswordRuleId[] = [
  "minLength",
  "lowercase",
  "uppercase",
  "digit",
  "special",
]

export function PasswordRequirements({
  password,
  className,
}: {
  password: string
  className?: string
}) {
  const { t } = useTranslation("auth")
  if (!password) return null

  const results = getPasswordRuleResults(password)
  const allVisibleMet = VISIBLE_RULES.every(
    (id) => results.find((rule) => rule.id === id)?.ok
  )
  // Hide checklist as soon as every shown rule passes.
  if (allVisibleMet) return null

  const met = VISIBLE_RULES.filter(
    (id) => results.find((rule) => rule.id === id)?.ok
  ).length
  const progress = Math.round((met / VISIBLE_RULES.length) * 100)

  return (
    <div
      className={cn(
        "border-border/50 bg-muted/30 space-y-1.5 rounded-md border px-2 py-1.5",
        className
      )}
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
          {t("passwordRules.title")}
        </span>
        <div className="bg-border/80 h-1 w-14 overflow-hidden rounded-full">
          <div
            className="bg-muted-foreground/50 h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <ul className="flex flex-wrap gap-1">
        {VISIBLE_RULES.map((id) => {
          const ok = results.find((rule) => rule.id === id)?.ok ?? false
          return (
            <li
              key={id}
              className={cn(
                "inline-flex max-w-full items-center gap-1 rounded px-1.5 py-0.5 text-[10px] leading-none",
                ok
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground bg-background/50"
              )}
            >
              <span
                className={cn(
                  "flex size-3 shrink-0 items-center justify-center rounded-full border",
                  ok
                    ? "border-primary/30 bg-primary/15"
                    : "border-border/70"
                )}
                aria-hidden
              >
                {ok ? <Check className="size-2" strokeWidth={3} /> : null}
              </span>
              <span className="truncate">{t(`passwordRules.${id}`)}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
