/** Targets that should not dismiss an open dialog/sheet (toasts, nested UI). */
export function shouldIgnoreOutsideDismiss(
  target: EventTarget | null,
  currentContent?: EventTarget | null
) {
  if (!(target instanceof Element)) return false

  if (
    target.closest("[data-sonner-toaster]") ||
    target.closest("[data-sonner-toast]") ||
    target.closest("[data-radix-popper-content-wrapper]") ||
    target.closest('[data-slot="popover-content"]') ||
    target.closest('[data-slot="select-content"]') ||
    target.closest('[data-slot="dropdown-menu-content"]') ||
    target.closest('[data-slot="combobox-content"]') ||
    target.closest("[data-confirm-dialog]")
  ) {
    return true
  }

  // Nested modal: only the topmost layer should dismiss on outside click.
  if (currentContent instanceof Element) {
    const layers = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-slot="dialog-content"][data-state="open"], [data-slot="sheet-content"][data-state="open"]'
      )
    )
    if (layers.length > 1) {
      const topmost = layers[layers.length - 1]
      if (currentContent !== topmost) return true
    }
  }

  return false
}
