// app/(app)/layout.tsx

import { AppSidebar } from "@/components/app-sidebar";
import { DashboardProviders } from "@/components/dashboard-providers";
import { SubscriptionGate } from "@/components/saas/subscription-gate";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { WelcomeFlow } from "@/components/welcome/welcome-flow";
import { SiteHeader } from "@/components/site-header";
import { SetupProgressBar } from "@/components/dashboard/setup-progress-bar";
import React from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardProviders>
    <SubscriptionGate>
    <SidebarProvider
      style={
        {
          "--sidebar-width": "250px",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <SetupProgressBar />
        <WelcomeFlow />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-1 flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
              {children}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
    </SubscriptionGate>
    </DashboardProviders>
  );
}
