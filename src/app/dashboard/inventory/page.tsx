"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { IconCircleCheckFilled, IconDotsVertical, IconLoader } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DataTable } from "@/components/data-table"
import data from "./data.json"
import { z } from "zod"

export const inventorySchema = z.object({
  srNo: z.number(),
  sku: z.string(),
  name: z.string(),
  category: z.string(),
  status: z.string(),
  stock: z.number(),
  orders: z.number(),
})

type InventoryItem = z.infer<typeof inventorySchema>

const inventoryColumns: ColumnDef<InventoryItem>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "srNo",
    header: "Sr. No",
    cell: ({ row }) => <div>{row.original.srNo}</div>,
  },
  {
    accessorKey: "sku",
    header: "SKU",
    cell: ({ row }) => (
      <div className="font-medium">{row.original.sku}</div>
    ),
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <div>{row.original.name}</div>,
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => (
      <Badge variant="outline" className="text-muted-foreground px-1.5">
        {row.original.category}
      </Badge>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status
      const isInStock = status === "In Stock"
      const isLowStock = status === "Low Stock"
      
      return (
        <Badge variant="outline" className="text-muted-foreground px-1.5">
          {isInStock ? (
            <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400 mr-1" />
          ) : isLowStock ? (
            <IconLoader className="mr-1" />
          ) : null}
          {status}
        </Badge>
      )
    },
  },
  {
    accessorKey: "stock",
    header: "Stock",
    cell: ({ row }) => (
      <div className="font-medium">{row.original.stock}</div>
    ),
  },
  {
    accessorKey: "orders",
    header: "Orders",
    cell: ({ row }) => (
      <div className="font-medium">{row.original.orders}</div>
    ),
  },
  {
    id: "actions",
    cell: () => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
            size="icon"
          >
            <IconDotsVertical />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem>Edit</DropdownMenuItem>
          <DropdownMenuItem>View Details</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]

export default function Inventory() {
  return (
    <DataTable 
      data={data as InventoryItem[]} 
      columns={inventoryColumns} 
      showSearch={true}
    />
  )
}
