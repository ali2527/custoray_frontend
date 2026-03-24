"use client"

import { IconCircleCheck, IconTrash } from "@tabler/icons-react"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import {
  DataTable,
  defaultColumns,
  type DataTableTab,
  schema,
} from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { toast } from "sonner"
import data from "./data.json"
import type { z } from "zod"

type DocRow = z.infer<typeof schema>

const sectionTabs: DataTableTab[] = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
]

function sectionTabFilter(row: DocRow, tab: string) {
  if (tab === "archived") return row.lifecycle === "archived"
  return row.lifecycle !== "archived"
}

function mapImportedDocument(
  row: Record<string, string>,
  existing: DocRow[]
): DocRow | null {
  const maxId = existing.reduce((m, x) => Math.max(m, x.id), 0)
  const id = Number(row.id)
  const finalId = Number.isFinite(id) && id > 0 ? id : maxId + 1
  if (!(row.header ?? "").trim()) return null
  const lc = (row.lifecycle ?? "active").toLowerCase()
  const lifecycle =
    lc === "inactive" || lc === "archived" ? lc : "active"
  return {
    id: finalId,
    header: row.header ?? "",
    type: row.type ?? "Narrative",
    status: row.status ?? "In Process",
    target: row.target ?? "0",
    limit: row.limit ?? "0",
    reviewer: row.reviewer ?? "Assign reviewer",
    lifecycle,
  }
}

export default function DashboardPage() {
  return (
    <>
      <SectionCards />
      <ChartAreaInteractive />
      <DataTable
        data={data}
        columns={defaultColumns}
        addButtonLabel="Add section"
        searchPlaceholder="Search sections..."
        importRowMapper={mapImportedDocument}
        importSampleFilename="sections-sample.csv"
        exportFilename="sections-export.csv"
        bulkActions={[
          {
            id: "approve",
            label: "Approve selected",
            icon: <IconCircleCheck className="size-4" />,
            onClick: (selected) => {
              toast.message(`Approved ${selected.length} section(s) (demo).`)
            },
          },
          {
            id: "delete",
            label: "Delete selected",
            icon: <IconTrash className="size-4" />,
            variant: "destructive",
            onClick: (selected) => {
              toast.message(`Would delete ${selected.length} section(s).`)
            },
          },
        ]}
        tabs={sectionTabs}
        defaultTab="active"
        tabFilter={sectionTabFilter}
      />
    </>
  )
}