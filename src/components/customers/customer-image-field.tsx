"use client"

import { useRef, useState } from "react"
import { IconCamera, IconUser, IconX } from "@tabler/icons-react"
import { useTranslation } from "react-i18next"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type CustomerImageFieldProps = {
  id: string
  name: string
  initialUrl?: string
}

export function CustomerImageField({ id, name, initialUrl = "" }: CustomerImageFieldProps) {
  const { t } = useTranslation("customers")
  const [imageUrl, setImageUrl] = useState(initialUrl.trim())
  const inputRef = useRef<HTMLInputElement>(null)
  const loadGen = useRef(0)
  const hasImage = Boolean(imageUrl)

  const resetFileInput = () => {
    if (inputRef.current) inputRef.current.value = ""
  }

  const addFile = (file: File | undefined) => {
    if (!file?.type.startsWith("image/")) return
    const gen = ++loadGen.current
    const reader = new FileReader()
    reader.onload = () => {
      if (gen !== loadGen.current) return
      setImageUrl(String(reader.result))
    }
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    loadGen.current += 1
    setImageUrl("")
    resetFileInput()
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Label htmlFor={id} className="sr-only">
        {t("images.photo")}
      </Label>
      <div className="relative">
        <label
          htmlFor={id}
          className="group relative block size-24 cursor-pointer"
          aria-label={hasImage ? t("images.change") : t("images.upload")}
        >
          <span
            className={cn(
              "border-border bg-muted flex size-24 overflow-hidden rounded-full border",
              !hasImage && "text-muted-foreground items-center justify-center"
            )}
          >
            {hasImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={name || t("entity.customer")}
                className="size-full object-cover"
              />
            ) : (
              <span className="flex size-full items-center justify-center">
                <IconUser className="size-10" />
              </span>
            )}
          </span>
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <IconCamera className="size-7 text-white" />
          </span>
        </label>
        {hasImage ? (
          <button
            type="button"
            className="bg-background text-muted-foreground hover:bg-destructive/10 hover:text-destructive absolute -top-0.5 -right-0.5 flex size-7 items-center justify-center rounded-full border shadow-sm transition-colors"
            aria-label={t("images.remove")}
            onClick={removeImage}
          >
            <IconX className="size-3.5" />
          </button>
        ) : null}
      </div>
      <Input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          addFile(e.target.files?.[0])
          e.target.value = ""
        }}
      />
      <input type="hidden" name="imageUrl" value={imageUrl} />
    </div>
  )
}
