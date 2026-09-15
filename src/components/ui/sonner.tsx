"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"

const toastSurface =
  "!bg-white !border-zinc-200/90 !text-zinc-900 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.18)]"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      position="bottom-right"
      closeButton
      offset={16}
      gap={10}
      duration={4000}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: `group toast w-[min(100%,22.5rem)] rounded-xl border ${toastSurface}`,
          title: "text-[13px] font-semibold tracking-tight !text-zinc-900",
          description: "text-[12px] leading-snug !text-zinc-500",
          icon: "size-5",
          actionButton:
            "rounded-md bg-primary text-primary-foreground text-xs font-medium",
          cancelButton:
            "rounded-md bg-zinc-100 text-zinc-600 text-xs font-medium",
          closeButton:
            "!border-zinc-200 !bg-white !text-zinc-400 hover:!bg-zinc-50 hover:!text-zinc-700",
          success: `${toastSurface} [&_[data-icon]]:text-emerald-600 [&_[data-description]]:!text-zinc-500`,
          error: `${toastSurface} [&_[data-icon]]:text-rose-600 [&_[data-description]]:!text-zinc-500`,
          warning: `${toastSurface} [&_[data-icon]]:text-amber-600 [&_[data-description]]:!text-zinc-500`,
          info: `${toastSurface} [&_[data-icon]]:text-sky-600 [&_[data-description]]:!text-zinc-500`,
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
