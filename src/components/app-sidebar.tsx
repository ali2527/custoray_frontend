"use client";
import * as React from "react"
import {
  IconRestore,
  IconChartBar,
  IconLayoutDashboard,
  IconUserStar,
  IconMoneybag,
  IconFileInvoice,
  IconHelp,
  IconPackage,
  IconUsers,
  IconSearch,
  IconSettings,
  IconUserUp,
  IconUserDown,
} from "@tabler/icons-react";
import {

  AudioWaveform,

  Command,

  GalleryVerticalEnd,
} from "lucide-react"
import { TeamSwitcher } from "@/components/team-switcher"
import { NavGeneral } from "@/components/nav-general"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar";

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Acme Inc",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: Command,
      plan: "Free",
    },
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconLayoutDashboard,
    },
    {
      title: "Inventory",
      url: "/dashboard/inventory",
      icon: IconPackage,
    },
    {
      title: "Customers",
      url: "#",
      icon: IconUsers,
    },
    {
      title: "Vedors",
      url: "#",
      icon: IconUserStar,
    },
    {
      title: "Sales",
      url: "#",
      icon: IconChartBar,
    },
    {
      title: "Purchase",
      url: "#",
      icon: IconMoneybag,
    },

    {
      title: "Returns",
      url: "#",
      icon: IconRestore,
    },


  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: IconSettings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: IconHelp,
    },
    {
      title: "Search",
      url: "#",
      icon: IconSearch,
    },
  ],
  payments: [
    {
      name: "Customer Payments",
      url: "#",
      icon: IconUserUp,
    },
    {
      name: "Vendor Payments",
      url: "#",
      icon: IconUserDown,
    },
  ],
  documents: [
    {
      name: "Invoice",
      url: "#",
      icon: IconFileInvoice,
    },
  ]
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent className="hide-scrollbar overflow-y-auto h-full">
        <NavMain items={data.navMain} />
        <NavGeneral items={data.payments} title="Payments" />
        <NavGeneral items={data.documents} title="Documents" />

        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
