import {
  DEFAULT_LANGUAGE,
  isAppLanguage,
  isRtlLanguage,
  type AppLanguage,
} from "@/i18n/config"

export type { AppLanguage }
export { isRtlLanguage }

export type FontSizeKey = "sm" | "base" | "lg" | "xl"

export type AppearancePrefs = {
  colorTheme: string
  customColor: string
  reduceMotion: boolean
  compactLayout: boolean
  language: AppLanguage
  fontSize: FontSizeKey
}

export const APPEARANCE_STORAGE_KEY = "custoray-appearance-v1"

export const FONT_SIZE_VALUES: Record<FontSizeKey, string> = {
  sm: "0.875rem",
  base: "0.9375rem",
  lg: "1.125rem",
  xl: "1.25rem",
}

export const ACCENT_PRESETS = [
  { id: "green", label: "Green", color: "#92c720" },
  { id: "emerald", label: "Emerald", color: "#10b981" },
  { id: "teal", label: "Teal", color: "#14b8a6" },
  { id: "cyan", label: "Cyan", color: "#06b6d4" },
  { id: "sky", label: "Sky", color: "#0ea5e9" },
  { id: "blue", label: "Blue", color: "#3b82f6" },
  { id: "indigo", label: "Indigo", color: "#6366f1" },
  { id: "violet", label: "Violet", color: "#8b5cf6" },
  { id: "purple", label: "Purple", color: "#a855f7" },
  { id: "fuchsia", label: "Fuchsia", color: "#c026d3" },
  { id: "pink", label: "Pink", color: "#ec4899" },
  { id: "rose", label: "Rose", color: "#f43f5e" },
  { id: "red", label: "Red", color: "#ef4444" },
  { id: "orange", label: "Orange", color: "#f97316" },
  { id: "amber", label: "Amber", color: "#f59e0b" },
  { id: "yellow", label: "Yellow", color: "#eab308" },
  { id: "lime", label: "Lime", color: "#84cc16" },
] as const

export const LANGUAGES = [
  { value: "en" as const, label: "English", nativeLabel: "English" },
  { value: "ar" as const, label: "Arabic (العربية)", nativeLabel: "العربية" },
  { value: "ur" as const, label: "Urdu (اردو)", nativeLabel: "اردو" },
]

export const DEFAULT_APPEARANCE: AppearancePrefs = {
  colorTheme: "green",
  customColor: "#92c720",
  reduceMotion: false,
  compactLayout: false,
  language: DEFAULT_LANGUAGE,
  fontSize: "base",
}

function isHexColor(value: string) {
  return /^#([0-9a-fA-F]{6})$/.test(value.trim())
}

export function parseAppearance(raw: string | null): AppearancePrefs | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<AppearancePrefs>
    return {
      colorTheme: typeof parsed.colorTheme === "string" ? parsed.colorTheme : DEFAULT_APPEARANCE.colorTheme,
      customColor: isHexColor(parsed.customColor ?? "")
        ? parsed.customColor!.trim()
        : DEFAULT_APPEARANCE.customColor,
      reduceMotion: Boolean(parsed.reduceMotion),
      compactLayout: Boolean(parsed.compactLayout),
      language: isAppLanguage(String(parsed.language ?? ""))
        ? (parsed.language as AppLanguage)
        : DEFAULT_LANGUAGE,
      fontSize:
        parsed.fontSize === "sm" || parsed.fontSize === "lg" || parsed.fontSize === "xl"
          ? parsed.fontSize
          : "base",
    }
  } catch {
    return null
  }
}

export function loadAppearance(): AppearancePrefs {
  if (typeof window === "undefined") return DEFAULT_APPEARANCE
  return parseAppearance(window.localStorage.getItem(APPEARANCE_STORAGE_KEY)) ?? DEFAULT_APPEARANCE
}

export function saveAppearance(prefs: AppearancePrefs) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(prefs))
}

export function applyAppearance(prefs: AppearancePrefs) {
  if (typeof document === "undefined") return
  const root = document.documentElement
  const custom = prefs.colorTheme === "custom" && isHexColor(prefs.customColor)

  if (custom) {
    root.setAttribute("data-theme", "custom")
    root.style.setProperty("--primary", prefs.customColor)
    root.style.setProperty("--ring", prefs.customColor)
    root.style.setProperty("--sidebar-primary", prefs.customColor)
  } else {
    root.style.removeProperty("--primary")
    root.style.removeProperty("--ring")
    root.style.removeProperty("--sidebar-primary")
    if (prefs.colorTheme && prefs.colorTheme !== "green") {
      root.setAttribute("data-theme", prefs.colorTheme)
    } else {
      root.removeAttribute("data-theme")
    }
  }

  root.setAttribute("data-density", prefs.compactLayout ? "compact" : "comfortable")
  root.setAttribute("data-reduce-motion", prefs.reduceMotion ? "true" : "false")
  root.style.setProperty("--app-font-size", FONT_SIZE_VALUES[prefs.fontSize])

  const rtl = isRtlLanguage(prefs.language)
  root.setAttribute("dir", rtl ? "rtl" : "ltr")
  root.setAttribute("lang", prefs.language)
}

export function presetColor(id: string) {
  return ACCENT_PRESETS.find((item) => item.id === id)?.color ?? DEFAULT_APPEARANCE.customColor
}
