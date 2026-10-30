"use client"

import Link from "next/link"
import {
  IconCreditCard,
  IconDeviceDesktop,
  IconLayoutGrid,
  IconPackage,
  IconReceipt,
  IconRefresh,
  IconSettings,
  IconSparkles,
} from "@tabler/icons-react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

import { SettingsSection } from "@/components/settings/settings-section"
import { SettingsToggleRow } from "@/components/settings/settings-toggle-row"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { usePosSettings } from "@/context/pos-settings-context"
import { usePaymentMethods } from "@/hooks/use-payment-methods"
import { ORDER_STATUSES, statusLabel } from "@/lib/orders"
import {
  DEFAULT_POS_SETTINGS,
  sanitizeReceiptPrefix,
  type PosSettings,
} from "@/lib/pos-settings"
import { cn } from "@/lib/utils"

const RECENT_SALES_OPTIONS = [3, 4, 6, 8, 10, 12] as const
const COLUMN_OPTIONS = [2, 3, 4] as const

const fieldClass = "space-y-1"
const labelClass = "text-xs font-medium"
const inputClass = "h-9 text-sm"
const selectTriggerClass = "h-9 w-full text-sm"
const hintClass = "text-muted-foreground text-[11px] leading-snug"
const toggleStackClass = "space-y-1.5"
const formGridClass = "grid gap-3 sm:grid-cols-2"

function PaymentMethodToggles({
  settings,
  updateSettings,
}: {
  settings: PosSettings
  updateSettings: (patch: Partial<PosSettings>) => void
}) {
  const { t } = useTranslation("pos")
  const { methods } = usePaymentMethods()
  const catalog = methods.length > 0 ? methods : settings.enabledPaymentMethods

  const toggleMethod = (method: string, enabled: boolean) => {
    const current = settings.enabledPaymentMethods
    if (enabled) {
      if (current.some((item) => item.toLowerCase() === method.toLowerCase())) return
      updateSettings({ enabledPaymentMethods: [...current, method] })
      return
    }
    if (current.length <= 1) {
      toast.error(t("settingsPage.onePaymentRequired"))
      return
    }
    updateSettings({
      enabledPaymentMethods: current.filter(
        (item) => item.toLowerCase() !== method.toLowerCase()
      ),
    })
  }

  return (
    <div className={toggleStackClass}>
      {catalog.map((method) => (
        <SettingsToggleRow
          key={method}
          compact
          title={method}
          description={
            method === settings.defaultPaymentMethod
              ? t("settingsPage.currentDefault")
              : undefined
          }
          checked={settings.enabledPaymentMethods.some(
            (item) => item.toLowerCase() === method.toLowerCase()
          )}
          onCheckedChange={(checked) => toggleMethod(method, checked)}
        />
      ))}
      <p className={hintClass}>
        Add or rename methods in{" "}
        <Link href="/settings/documents" className="text-primary underline-offset-2 hover:underline">
          Settings → Documents
        </Link>
        .
      </p>
    </div>
  )
}

export function PosSettingsPanel() {
  const { t } = useTranslation("pos")
  const { settings, updateSettings, resetSettings } = usePosSettings()

  const handleReset = () => {
    resetSettings()
    toast.success(t("settingsPage.resetDefaults"))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
          <IconSettings className="size-4" stroke={1.75} />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight">{t("settings")}</h2>
          <p className="text-muted-foreground text-xs leading-snug">
            {t("settingsPage.intro")}
          </p>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <SettingsSection
          compact
          title={t("settingsPage.registerTitle")}
          description={t("settingsPage.registerHint")}
          icon={<IconDeviceDesktop stroke={1.75} />}
          iconClassName="bg-primary/10 text-primary"
        >
          <div className={formGridClass}>
            <div className={fieldClass}>
              <Label htmlFor="pos-register-name" className={labelClass}>
                {t("settingsPage.registerName")}
              </Label>
              <Input
                id="pos-register-name"
                className={inputClass}
                value={settings.registerName}
                onChange={(event) =>
                  updateSettings({ registerName: event.target.value.slice(0, 40) })
                }
                placeholder={t("settingsPage.mainRegister")}
              />
            </div>
            <div className={fieldClass}>
              <Label htmlFor="pos-receipt-prefix" className={labelClass}>
                {t("settingsPage.receiptPrefix")}
              </Label>
              <Input
                id="pos-receipt-prefix"
                className={cn(inputClass, "uppercase")}
                value={settings.receiptPrefix}
                onChange={(event) =>
                  updateSettings({
                    receiptPrefix: sanitizeReceiptPrefix(event.target.value),
                  })
                }
                placeholder="POS"
              />
              <p className={hintClass}>
                {t("settingsPage.nextReceipt", {
                  prefix: sanitizeReceiptPrefix(settings.receiptPrefix),
                })}
              </p>
            </div>
            <div className={fieldClass}>
              <Label htmlFor="pos-default-mode" className={labelClass}>
                {t("settingsPage.openRegisterOn")}
              </Label>
              <Select
                value={settings.defaultRegisterMode}
                onValueChange={(value) =>
                  updateSettings({
                    defaultRegisterMode: value as PosSettings["defaultRegisterMode"],
                  })
                }
              >
                <SelectTrigger id="pos-default-mode" className={selectTriggerClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sale">{t("newSale")}</SelectItem>
                  <SelectItem value="return">{t("returns")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className={fieldClass}>
              <Label htmlFor="pos-recent-limit" className={labelClass}>
                {t("settingsPage.recentSales")}
              </Label>
              <Select
                value={String(settings.recentSalesLimit)}
                onValueChange={(value) =>
                  updateSettings({ recentSalesLimit: Number(value) })
                }
              >
                <SelectTrigger id="pos-recent-limit" className={selectTriggerClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECENT_SALES_OPTIONS.map((count) => (
                    <SelectItem key={count} value={String(count)}>
                      {t("settingsPage.receiptCount", { count })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection
          compact
          title={t("settingsPage.catalogTitle")}
          description={t("settingsPage.catalogHint")}
          icon={<IconLayoutGrid stroke={1.75} />}
          iconClassName="bg-sky-500/10 text-sky-600 dark:text-sky-400"
        >
          <div className={formGridClass}>
            <div className={fieldClass}>
              <Label htmlFor="pos-catalog-columns" className={labelClass}>
                {t("settingsPage.gridColumns")}
              </Label>
              <Select
                value={String(settings.catalogColumns)}
                onValueChange={(value) =>
                  updateSettings({
                    catalogColumns: Number(value) as PosSettings["catalogColumns"],
                  })
                }
              >
                <SelectTrigger id="pos-catalog-columns" className={selectTriggerClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLUMN_OPTIONS.map((count) => (
                    <SelectItem key={count} value={String(count)}>
                      {t("settingsPage.columnCount", { count })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={fieldClass}>
              <Label htmlFor="pos-low-stock" className={labelClass}>
                {t("settingsPage.lowStock")}
              </Label>
              <Input
                id="pos-low-stock"
                className={inputClass}
                type="number"
                min={1}
                max={99}
                value={settings.lowStockThreshold}
                onChange={(event) => {
                  const parsed = Number(event.target.value)
                  if (Number.isFinite(parsed)) {
                    updateSettings({
                      lowStockThreshold: Math.min(99, Math.max(1, parsed)),
                    })
                  }
                }}
              />
            </div>
          </div>
          <div className={toggleStackClass}>
            <SettingsToggleRow
              compact
              title={t("settingsPage.showSku")}
              checked={settings.showSkuOnCards}
              onCheckedChange={(checked) => updateSettings({ showSkuOnCards: checked })}
            />
            <SettingsToggleRow
              compact
              title={t("settingsPage.showStock")}
              checked={settings.showStockOnCards}
              onCheckedChange={(checked) => updateSettings({ showStockOnCards: checked })}
            />
            <SettingsToggleRow
              compact
              title={t("settingsPage.hideOutOfStock")}
              description={t("settingsPage.hideOutOfStockHint")}
              checked={settings.hideOutOfStockOnSale}
              onCheckedChange={(checked) => updateSettings({ hideOutOfStockOnSale: checked })}
            />
          </div>
        </SettingsSection>
      </div>

      <SettingsSection
        compact
        title={t("settingsPage.checkoutTitle")}
        description={t("settingsPage.checkoutHint")}
        icon={<IconCreditCard stroke={1.75} />}
        iconClassName="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      >
        <div className={formGridClass}>
          <div className={fieldClass}>
            <Label htmlFor="pos-default-payment" className={labelClass}>
              {t("settingsPage.defaultPayment")}
            </Label>
            <Select
              value={settings.defaultPaymentMethod}
              onValueChange={(value) =>
                updateSettings({
                  defaultPaymentMethod: value as PosSettings["defaultPaymentMethod"],
                })
              }
            >
              <SelectTrigger id="pos-default-payment" className={selectTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {settings.enabledPaymentMethods.map((method) => (
                  <SelectItem key={method} value={method}>
                    {method}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className={fieldClass}>
            <Label htmlFor="pos-max-discount" className={labelClass}>
              {t("settingsPage.maxDiscount")}
            </Label>
            <Input
              id="pos-max-discount"
              className={inputClass}
              type="number"
              min={0}
              max={100}
              value={settings.maxDiscountPercent}
              onChange={(event) => {
                const parsed = Number(event.target.value)
                if (Number.isFinite(parsed)) {
                  updateSettings({
                    maxDiscountPercent: Math.min(100, Math.max(0, parsed)),
                  })
                }
              }}
            />
            <p className={hintClass}>{t("settingsPage.noLimit")}</p>
          </div>
          <div className={fieldClass}>
            <Label htmlFor="pos-default-sale-status" className={labelClass}>
              {t("settingsPage.defaultSaleStatus")}
            </Label>
            <Select
              value={settings.defaultSaleStatus}
              onValueChange={(value) =>
                updateSettings({
                  defaultSaleStatus: value as PosSettings["defaultSaleStatus"],
                })
              }
            >
              <SelectTrigger id="pos-default-sale-status" className={selectTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORDER_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {statusLabel(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className={fieldClass}>
            <Label htmlFor="pos-default-return-status" className={labelClass}>
              {t("settingsPage.defaultReturnStatus")}
            </Label>
            <Select
              value={settings.defaultReturnStatus}
              onValueChange={(value) =>
                updateSettings({
                  defaultReturnStatus: value as PosSettings["defaultReturnStatus"],
                })
              }
            >
              <SelectTrigger id="pos-default-return-status" className={selectTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORDER_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {statusLabel(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className={toggleStackClass}>
          <SettingsToggleRow
            compact
            title={t("settingsPage.allowDiscounts")}
            checked={settings.allowDiscounts}
            onCheckedChange={(checked) => updateSettings({ allowDiscounts: checked })}
          />
          <SettingsToggleRow
            compact
            title={t("settingsPage.allowPriceEdits")}
            description={t("settingsPage.allowPriceEditsHint")}
            checked={settings.allowLinePriceEdit}
            onCheckedChange={(checked) => updateSettings({ allowLinePriceEdit: checked })}
          />
          <SettingsToggleRow
            compact
            title={t("settingsPage.allowPartial")}
            description={t("settingsPage.allowPartialHint")}
            checked={settings.allowPartialPayment}
            onCheckedChange={(checked) => updateSettings({ allowPartialPayment: checked })}
          />
          <SettingsToggleRow
            compact
            title={t("settingsPage.requireCustomer")}
            description={t("settingsPage.requireCustomerHint")}
            checked={settings.requireCustomer}
            onCheckedChange={(checked) => updateSettings({ requireCustomer: checked })}
          />
          <SettingsToggleRow
            compact
            title={t("settingsPage.confirmBefore")}
            checked={settings.confirmBeforeComplete}
            onCheckedChange={(checked) =>
              updateSettings({ confirmBeforeComplete: checked })
            }
          />
        </div>

        <div className="border-border/40 space-y-2 border-t pt-3">
          <p className="text-emerald-600 dark:text-emerald-400 text-xs font-medium">
            {t("settingsPage.enabledMethods")}
          </p>
          <PaymentMethodToggles settings={settings} updateSettings={updateSettings} />
        </div>
      </SettingsSection>

      <div className="grid gap-3 xl:grid-cols-2">
        <SettingsSection
          compact
          title={t("settingsPage.receiptsTitle")}
          description={t("settingsPage.receiptHint")}
          icon={<IconReceipt stroke={1.75} />}
          iconClassName="bg-amber-500/10 text-amber-600 dark:text-amber-400"
        >
          <div className={fieldClass}>
            <Label htmlFor="pos-receipt-footer" className={labelClass}>
              {t("settingsPage.receiptFooter")}
            </Label>
            <textarea
              id="pos-receipt-footer"
              value={settings.receiptFooterNote}
              onChange={(event) =>
                updateSettings({ receiptFooterNote: event.target.value.slice(0, 200) })
              }
              placeholder={t("settingsPage.thankYouPlaceholder")}
              rows={2}
              className={cn(
                "border-input bg-background placeholder:text-muted-foreground flex min-h-[64px] w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none",
                "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              )}
            />
          </div>
          <SettingsToggleRow
            compact
            title={t("settingsPage.autoPdf")}
            description={t("settingsPage.autoPdfHint")}
            checked={settings.autoOpenReceiptPdf}
            onCheckedChange={(checked) => updateSettings({ autoOpenReceiptPdf: checked })}
          />
        </SettingsSection>

        <SettingsSection
          compact
          title={t("settingsPage.inventoryTitle")}
          description={t("settingsPage.inventoryHint")}
          icon={<IconPackage stroke={1.75} />}
          iconClassName="bg-orange-500/10 text-orange-600 dark:text-orange-400"
        >
          <div className={toggleStackClass}>
            <SettingsToggleRow
              compact
              title={t("settingsPage.allowOverselling")}
              description={t("settingsPage.allowOversellingHint")}
              checked={settings.allowOverselling}
              onCheckedChange={(checked) => updateSettings({ allowOverselling: checked })}
            />
            <SettingsToggleRow
              compact
              title={t("settingsPage.deductPending")}
              description={t("settingsPage.deductPendingHint")}
              checked={settings.deductStockOnPending}
              onCheckedChange={(checked) => updateSettings({ deductStockOnPending: checked })}
            />
          </div>
        </SettingsSection>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <SettingsSection
          compact
          title={t("settingsPage.uxTitle")}
          description={t("settingsPage.uxHint")}
          icon={<IconSparkles stroke={1.75} />}
          iconClassName="bg-violet-500/10 text-violet-600 dark:text-violet-400"
        >
          <SettingsToggleRow
            compact
            title={t("settingsPage.focusSearch")}
            description={t("settingsPage.focusSearchHint")}
            checked={settings.autoFocusSearchAfterSale}
            onCheckedChange={(checked) =>
              updateSettings({ autoFocusSearchAfterSale: checked })
            }
          />
        </SettingsSection>

        <SettingsSection
          compact
          title={t("settingsPage.resetTitle")}
          description={t("settingsPage.restoreHint")}
          icon={<IconRefresh stroke={1.75} />}
          iconClassName="bg-muted text-muted-foreground"
          contentClassName="space-y-0"
          footer={
            <Button type="button" variant="outline" size="sm" onClick={handleReset}>
              {t("settingsPage.resetButton")}
            </Button>
          }
        >
          <p className={hintClass}>
            {t("settingsPage.defaultsLine", {
              name: DEFAULT_POS_SETTINGS.registerName,
              prefix: DEFAULT_POS_SETTINGS.receiptPrefix,
              status: statusLabel(DEFAULT_POS_SETTINGS.defaultSaleStatus),
            })}
          </p>
        </SettingsSection>
      </div>
    </div>
  )
}
