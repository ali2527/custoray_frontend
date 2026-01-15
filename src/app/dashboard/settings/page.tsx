"use client"
import React, { useEffect, useState } from "react"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

// Custom style mappings
const fontSizes = {
  sm: "0.875rem",
  base: "1rem",
  lg: "1.125rem",
  xl: "1.25rem",
} as const

const themes = ["default", "blue", "red", "green", "purple"]

const languages = [
  { value: "en", label: "English" },
  { value: "ar", label: "Arabic (العربية)" },
]

export default function Settings() {
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system")
  const [fontSize, setFontSize] = useState<keyof typeof fontSizes>("base")
  const [colorTheme, setColorTheme] = useState("default")
  const [language, setLanguage] = useState("en")
  const [rtlEnabled, setRtlEnabled] = useState(false)

  const [notifications, setNotifications] = useState({
    app: true,
    email: true,
    sms: false,
  })

  const [toggles, setToggles] = useState({
    reduceMotion: false,
    compactLayout: false,
    autoSave: true,
  })

  // Apply font size
  useEffect(() => {
    document.documentElement.style.setProperty("--app-font-size", fontSizes[fontSize])
  }, [fontSize])

  // Apply color theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", colorTheme)
  }, [colorTheme])

  // Apply theme mode
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove("light", "dark")

    if (theme === "light") root.classList.add("light")
    else if (theme === "dark") root.classList.add("dark")
    else if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      root.classList.add(systemTheme)
    }
  }, [theme])

  // Apply RTL support
  useEffect(() => {
    const rtlLangs = ["ar", "he", "fa", "ur"]
    const isRtl = rtlLangs.includes(language)
    document.documentElement.setAttribute("dir", isRtl ? "rtl" : "ltr")
    setRtlEnabled(isRtl)
  }, [language])

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <h2 className="text-2xl font-semibold">Settings</h2>

      {/* Theme Mode */}
      <div className="space-y-1">
        <Label>Theme</Label>
        <Select value={theme} onValueChange={(val) => setTheme(val as typeof theme)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="light">Light</SelectItem>
            <SelectItem value="dark">Dark</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Color Theme */}
      <div className="space-y-1">
        <Label>Color Theme</Label>
        <Select value={colorTheme} onValueChange={setColorTheme}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {themes.map((theme) => (
              <SelectItem key={theme} value={theme}>
                {theme.charAt(0).toUpperCase() + theme.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Font Size */}
      <div className="space-y-1">
        <Label>Font Size</Label>
        <Select value={fontSize} onValueChange={(val) => setFontSize(val as keyof typeof fontSizes)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(fontSizes).map((size) => (
              <SelectItem key={size} value={size}>
                {size.toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Language */}
      <div className="space-y-1">
        <Label>Language</Label>
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {languages.map((lang) => (
              <SelectItem key={lang.value} value={lang.value}>
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          {rtlEnabled ? "RTL mode enabled" : "LTR mode enabled"}
        </p>
      </div>

      {/* Notifications */}
      <div className="space-y-1">
        <Label className="text-base">Notifications</Label>
        {Object.entries(notifications).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between">
            <Label className="capitalize">{key} Notifications</Label>
            <Switch
              checked={value}
              onCheckedChange={(val) =>
                setNotifications((prev) => ({ ...prev, [key]: val }))
              }
            />
          </div>
        ))}
      </div>

      {/* Additional Toggles */}
      <div className="space-y-1">
        <Label className="text-base">Preferences</Label>
        {Object.entries(toggles).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between">
            <Label className="capitalize">{key.replace(/([a-z])([A-Z])/g, "$1 $2")}</Label>
            <Switch
              checked={value}
              onCheckedChange={(val) =>
                setToggles((prev) => ({ ...prev, [key]: val }))
              }
            />
          </div>
        ))}
      </div>
    </div>
  )
}
