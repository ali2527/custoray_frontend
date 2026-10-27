"use client"

import { Check } from "lucide-react"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"

export type ThemeMode = "light" | "dark" | "system"

function DashboardMock({ dark, compact }: { dark?: boolean; compact?: boolean }) {
  const shell = dark ? "bg-[#111827]" : "bg-white"
  const side = dark ? "bg-[#0b1220]" : "bg-[#f8fafc]"
  const ink = dark ? "bg-zinc-500" : "bg-zinc-300"
  const soft = dark ? "bg-zinc-700/80" : "bg-zinc-100"
  const title = dark ? "bg-zinc-400" : "bg-zinc-700"
  const card = dark ? "bg-[#1f2937] border-zinc-700/80" : "bg-white border-zinc-200/90"
  const accent = "bg-[#3b82f6]"

  return (
    <div
      className={cn(
        "flex h-full w-full overflow-hidden rounded-[0.65rem] border shadow-[0_1px_2px_rgba(15,23,42,0.06)]",
        shell,
        dark ? "border-zinc-700" : "border-zinc-200"
      )}
    >
      <div className={cn("flex w-[26%] flex-col gap-1.5 border-e p-1.5", side, dark ? "border-zinc-800" : "border-zinc-100")}>
        <span className={cn("mb-0.5 size-3 rounded-full", soft)} />
        <span className={cn("h-1 w-full rounded-full", ink)} />
        <span className={cn("h-1 w-4/5 rounded-full", ink)} />
        <span className={cn("h-1 w-3/5 rounded-full", accent, "opacity-80")} />
        <span className={cn("h-1 w-3/4 rounded-full", ink)} />
        <span className={cn("mt-auto h-1 w-1/2 rounded-full", ink)} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-1.5">
        <div className="flex items-center justify-between gap-1">
          <div className="flex min-w-0 items-center gap-1">
            <span className="flex shrink-0 gap-0.5">
              <span className="size-1 rounded-full bg-[#ff5f57]" />
              <span className="size-1 rounded-full bg-[#febc2e]" />
              <span className="size-1 rounded-full bg-[#28c840]" />
            </span>
            <span className={cn("ms-1 h-1.5 w-10 max-w-[45%] rounded-full", title)} />
          </div>
          <span className={cn("h-3 w-5 shrink-0 rounded-sm", accent, "opacity-90")} />
        </div>
        <div className={cn("grid flex-1 gap-1", compact ? "grid-cols-1" : "grid-cols-2")}>
          <div className={cn("rounded-md border p-1", card)}>
            <span className={cn("mb-1 block h-1 w-1/2 rounded-full", ink)} />
            <span className={cn("block h-5 w-full rounded-sm", soft)} />
          </div>
          {!compact ? (
            <div className={cn("rounded-md border p-1", card)}>
              <span className={cn("mb-1 block h-1 w-2/3 rounded-full", ink)} />
              <div className="mt-auto flex h-5 items-end gap-0.5">
                <span className={cn("h-2 w-1 rounded-sm", soft)} />
                <span className={cn("h-3.5 w-1 rounded-sm", accent, "opacity-70")} />
                <span className={cn("h-3 w-1 rounded-sm", soft)} />
                <span className={cn("h-4 w-1 rounded-sm", accent, "opacity-50")} />
                <span className={cn("h-2.5 w-1 rounded-sm", soft)} />
              </div>
            </div>
          ) : null}
        </div>
        <div className={cn("h-2 w-full rounded-sm", soft)} />
      </div>
    </div>
  )
}

function ThemeWindowPreview({
  mode,
  size = "md",
}: {
  mode: ThemeMode
  size?: "sm" | "md"
}) {
  const pad =
    size === "md"
      ? "p-2 min-h-[6.5rem] sm:p-3 sm:min-h-[8.25rem]"
      : "p-1.5 min-h-[4.75rem] sm:p-2.5 sm:min-h-[6.25rem]"

  if (mode === "system") {
    return (
      <div className={cn("relative grid w-full grid-cols-2 overflow-hidden bg-[#eef2f7]", pad)}>
        <div className="pe-0.5 sm:pe-1">
          <div className="h-full min-h-[3.75rem] overflow-hidden rounded-[0.65rem] sm:min-h-[5rem]">
            <DashboardMock compact />
          </div>
        </div>
        <div className="ps-0.5 sm:ps-1">
          <div className="h-full min-h-[3.75rem] overflow-hidden rounded-[0.65rem] sm:min-h-[5rem]">
            <DashboardMock dark compact />
          </div>
        </div>
        <span className="pointer-events-none absolute inset-y-2 left-1/2 w-px -translate-x-1/2 bg-zinc-300/80 sm:inset-y-3" />
      </div>
    )
  }

  const dark = mode === "dark"
  return (
    <div className={cn("w-full", pad, dark ? "bg-[#0f172a]" : "bg-[#eef2f7]")}>
      <div className={cn("h-full", size === "md" ? "min-h-[5rem] sm:min-h-[6.5rem]" : "min-h-[3.75rem] sm:min-h-[4.75rem]")}>
        <DashboardMock dark={dark} />
      </div>
    </div>
  )
}

type ThemeModePickerProps = {
  value: ThemeMode
  onChange: (mode: ThemeMode) => void
  size?: "sm" | "md"
  showDescriptions?: boolean
  labels?: Partial<Record<ThemeMode, string>>
  descriptions?: Partial<Record<ThemeMode, string>>
  className?: string
}

export function ThemeModePicker({
  value,
  onChange,
  size = "md",
  showDescriptions = false,
  labels,
  descriptions,
  className,
}: ThemeModePickerProps) {
  const { t } = useTranslation("settings")

  const options: { id: ThemeMode; label: string; description?: string }[] = [
    {
      id: "light",
      label: labels?.light ?? t("appearance.lightMode"),
      description: descriptions?.light ?? t("appearance.lightModeDesc"),
    },
    {
      id: "dark",
      label: labels?.dark ?? t("appearance.darkMode"),
      description: descriptions?.dark ?? t("appearance.darkModeDesc"),
    },
    {
      id: "system",
      label: labels?.system ?? t("appearance.systemPreferences"),
      description: descriptions?.system ?? t("appearance.systemPreferencesDesc"),
    },
  ]

  return (
    <div className={cn("grid grid-cols-3 gap-2 sm:gap-3", className)}>
      {options.map((item) => {
        const selected = value === item.id
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            aria-pressed={selected}
            className="flex min-w-0 flex-col items-stretch gap-1.5 text-start sm:gap-2"
          >
            <span
              className={cn(
                "relative overflow-hidden rounded-xl border transition-colors",
                selected
                  ? "border-blue-600 shadow-[0_0_0_1px_#2563eb]"
                  : "border-border hover:border-muted-foreground/30"
              )}
            >
              <ThemeWindowPreview mode={item.id} size={size} />
              {selected ? (
                <span className="absolute end-2 bottom-2 z-10 flex size-5 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
                  <Check className="size-3" strokeWidth={3} />
                </span>
              ) : null}
            </span>
            <span className="min-w-0">
              <span
                className={cn(
                  "block truncate text-xs sm:text-sm",
                  selected ? "font-semibold text-foreground" : "font-medium text-foreground/80"
                )}
              >
                {item.label}
              </span>
              {showDescriptions && item.description ? (
                <span className="text-muted-foreground mt-0.5 block text-xs leading-snug">
                  {item.description}
                </span>
              ) : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}
