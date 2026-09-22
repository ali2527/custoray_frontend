"use client"

import { useEffect, useState } from "react"

import {
  DEFAULT_DOCUMENT_NUMBER_SETTINGS,
  DOCUMENT_NUMBER_SETTINGS_EVENT,
  loadDocumentNumberSettings,
  saveDocumentNumberSettings,
  type DocumentNumberEntry,
  type DocumentNumberKey,
  type DocumentNumberMode,
  type DocumentNumberSettings,
} from "@/lib/document-number-settings"

export function useDocumentNumberSettings() {
  const [settings, setSettings] = useState<DocumentNumberSettings>(
    DEFAULT_DOCUMENT_NUMBER_SETTINGS
  )

  useEffect(() => {
    const sync = () => setSettings(loadDocumentNumberSettings())
    sync()
    window.addEventListener(DOCUMENT_NUMBER_SETTINGS_EVENT, sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener(DOCUMENT_NUMBER_SETTINGS_EVENT, sync)
      window.removeEventListener("storage", sync)
    }
  }, [])

  function persist(next: DocumentNumberSettings) {
    setSettings(next)
    saveDocumentNumberSettings(next)
  }

  function updateEntry(key: DocumentNumberKey, patch: Partial<DocumentNumberEntry>) {
    persist({
      ...settings,
      [key]: {
        ...settings[key],
        ...patch,
      },
    })
  }

  function setMode(key: DocumentNumberKey, mode: DocumentNumberMode) {
    updateEntry(key, { mode })
  }

  return { settings, persist, updateEntry, setMode }
}
