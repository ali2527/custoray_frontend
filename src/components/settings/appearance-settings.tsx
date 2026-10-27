"use client"

import { Check } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { Switch } from "@/components/ui/switch"
import { useAppearance } from "@/components/theme/appearance-provider"
import { AccentColorPicker } from "@/components/theme/accent-color-picker"
import { ThemeModePicker, type ThemeMode } from "@/components/theme/theme-mode-picker"
import { presetColor } from "@/lib/appearance-prefs"
import { cn } from "@/lib/utils"

function TablePreview({ compact }: { compact?: boolean }) {
  const rows = compact ? 5 : 3
  return (
    <div className="bg-muted/40 flex min-h-[8.5rem] flex-col gap-1 p-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "bg-background flex items-center gap-2 rounded-md border px-2",
            compact ? "h-5" : "h-8"
          )}
        >
          <span className="bg-muted h-2 w-8 rounded-sm" />
          <span className="bg-muted h-2 flex-1 rounded-sm" />
          <span className="bg-primary/40 h-2 w-10 rounded-sm" />
        </div>
      ))}
    </div>
  )
}

function ChoiceCard({
  selected,
  onClick,
  label,
  description,
  children,
}: {
  selected: boolean
  onClick: () => void
  label: string
  description?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex cursor-pointer flex-col overflow-hidden rounded-xl border text-start transition-colors",
        selected
          ? "border-primary bg-primary/5 ring-primary/30 ring-2"
          : "border-border hover:border-primary/40 bg-card"
      )}
    >
      {selected ? (
        <span className="bg-primary text-primary-foreground absolute top-2.5 end-2.5 z-10 flex size-5 items-center justify-center rounded-full">
          <Check className="size-3" strokeWidth={3} />
        </span>
      ) : null}
      <div className="overflow-hidden">{children}</div>
      <div className="px-3 py-2.5">
        <p className="text-sm font-medium">{label}</p>
        {description ? (
          <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
        ) : null}
      </div>
    </button>
  )
}


export function AppearanceSettings() {
  const { t } = useTranslation("settings")
  const { prefs, update } = useAppearance()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const mode = mounted ? (theme ?? "system") : "system"
  const customHex =
    prefs.colorTheme === "custom" ? prefs.customColor : presetColor(prefs.colorTheme)

  return (
    <div className="divide-border flex flex-col divide-y">
      <section className="pb-8">
        <h2 className="text-base font-semibold">{t("appearance.themes")}</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("appearance.themesDescription")}
        </p>
        <ThemeModePicker
          className="mt-4"
          value={mode as ThemeMode}
          onChange={(next) => setTheme(next)}
          size="md"
        />
      </section>

      <section className="py-8">
        <h2 className="text-base font-semibold">{t("appearance.accentColors")}</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("appearance.accentColorsDescription")}
        </p>
        <AccentColorPicker
          className="mt-4"
          colorTheme={prefs.colorTheme}
          customColor={customHex}
          onChange={(next) => update(next)}
        />
      </section>

      <section className="flex items-start justify-between gap-6 py-8">
        <div>
          <h2 className="text-base font-semibold">{t("appearance.showAnimations")}</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("appearance.showAnimationsDescription")}
          </p>
        </div>
        <Switch
          checked={!prefs.reduceMotion}
          onCheckedChange={(checked) => update({ reduceMotion: !checked })}
          className="h-6 w-11"
          aria-label={t("appearance.showAnimations")}
        />
      </section>

      <section className="pt-8">
        <h2 className="text-base font-semibold">{t("appearance.tablesView")}</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("appearance.tablesViewDescription")}
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <ChoiceCard
            selected={!prefs.compactLayout}
            onClick={() => update({ compactLayout: false })}
            label={t("appearance.comfortable")}
            description={t("appearance.comfortableDesc")}
          >
            <TablePreview />
          </ChoiceCard>
          <ChoiceCard
            selected={prefs.compactLayout}
            onClick={() => update({ compactLayout: true })}
            label={t("appearance.compact")}
            description={t("appearance.compactDesc")}
          >
            <TablePreview compact />
          </ChoiceCard>
        </div>
      </section>
    </div>
  )
}
