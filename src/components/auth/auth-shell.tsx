import type { ReactNode } from "react"
import Link from "next/link"

import { AuthBrand } from "@/components/auth/auth-brand"
import { AuthMarketingPanel } from "@/components/auth/auth-marketing"
import { Card, CardContent } from "@/components/ui/card"
import { ToggleButton } from "@/components/ui/toggle-button"
import { cn } from "@/lib/utils"

export const AUTH_INPUT =
  "h-10 rounded-lg border bg-background text-xs shadow-none md:text-xs focus-visible:ring-1 focus-visible:ring-ring/40"
export const AUTH_BUTTON =
  "h-10 w-full rounded-lg text-xs font-medium shadow-none"

const CARD_SIZE =
  "gap-0 overflow-hidden rounded-2xl border border-border/70 p-0 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_16px_40px_rgba(15,23,42,0.08)] md:h-[38.5rem] md:min-h-[38.5rem]"

export function AuthShell({
  children,
  className,
  hero = "signin",
}: {
  children: ReactNode
  className?: string
  hero?: "signin" | "signup" | "reset_email" | "reset_code" | "reset_password" | "twofa"
}) {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center bg-[#f6f7f4] p-4 sm:p-6 md:p-8 dark:bg-background">
      <ToggleButton
        variant="ghost"
        className="text-muted-foreground size-8 rounded-full"
      />
      <div className="w-full max-w-md sm:max-w-2xl md:max-w-4xl lg:max-w-[58rem]">
        <Card className={CARD_SIZE}>
          <CardContent className="grid h-full min-h-0 p-0 md:grid-cols-2">
            <div className="flex h-full min-h-0 flex-col justify-center overflow-hidden px-6 py-6 sm:px-8 md:px-10">
              <div className={cn("mx-auto flex w-full max-w-[22.5rem] flex-col text-xs [&_label]:text-xs", className)}>
                <AuthBrand className="mb-5" />
                {children}
              </div>
            </div>
            <AuthMarketingPanel variant={hero} />
          </CardContent>
        </Card>
        <p className="text-muted-foreground mt-5 text-center text-[11px] leading-relaxed">
          © {new Date().getFullYear()} Custoray.{" "}
          <Link href="/legal/terms" className="hover:text-foreground hover:underline">
            Terms
          </Link>
          {" · "}
          <Link href="/legal/privacy" className="hover:text-foreground hover:underline">
            Privacy
          </Link>
        </p>
      </div>
    </div>
  )
}

export function AuthHeading({
  title,
  accent,
  subtitle,
}: {
  title: string
  accent?: string
  subtitle: string
}) {
  const renderedTitle =
    accent && title.includes(accent) ? (
      <>
        {title.split(accent)[0]}
        <span className="text-primary">{accent}</span>
        {title.split(accent).slice(1).join(accent)}
      </>
    ) : (
      title
    )

  return (
    <div className="mb-5 space-y-1.5">
      <h1 className="text-lg font-semibold tracking-tight text-foreground">
        {renderedTitle}
      </h1>
      <p className="text-muted-foreground text-xs leading-snug">{subtitle}</p>
    </div>
  )
}

export function AuthSwitch({
  prompt,
  href,
  label,
  onNavigate,
}: {
  prompt: string
  href: string
  label: string
  onNavigate?: () => void
}) {
  return (
    <p className="text-muted-foreground pt-1 text-center text-xs">
      {prompt}{" "}
      <Link
        href={href}
        prefetch
        onClick={onNavigate}
        className="text-primary font-medium hover:underline"
      >
        {label}
      </Link>
    </p>
  )
}
