// app/dashboard/page.tsx

import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable, defaultColumns } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import data from "./data.json";

export default function DashboardPage() {
  return (
    <>
      <SectionCards />
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive />
      </div>
      <DataTable data={data} columns={defaultColumns} />
    </>
  );
}
