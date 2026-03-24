"use client"

import { ColumnDef } from "@tanstack/react-table"
import {
  IconAlertTriangleFilled,
  IconArchive,
  IconCircleCheckFilled,
  IconCircleXFilled,
  IconDotsVertical,
  IconTrash,
  IconTrendingUp,
} from "@tabler/icons-react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { toast } from "sonner"
import { z } from "zod"

import { DataTable, type DataTableTab } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useIsMobile } from "@/hooks/use-mobile"
import data from "../data.json"

export const productSchema = z.object({
  srNo: z.number(),
  sku: z.string(),
  name: z.string(),
  category: z.string(),
  status: z.string(),
  stock: z.number(),
  orders: z.number(),
  price: z.string(),
  supplier: z.string(),
  lifecycle: z.enum(["active", "inactive", "archived"]).default("active"),
})

export type ProductRow = z.infer<typeof productSchema>

const productTabs: DataTableTab[] = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
]

function productTabFilter(row: ProductRow, tab: string) {
  if (tab === "archived") return row.lifecycle === "archived"
  return row.lifecycle !== "archived"
}

function mapImportedProduct(
  row: Record<string, string>,
  existing: ProductRow[]
): ProductRow | null {
  const maxSr = existing.reduce((m, x) => Math.max(m, x.srNo), 0)
  const srNo = Number(row.srNo)
  const finalSr = Number.isFinite(srNo) && srNo > 0 ? srNo : maxSr + 1
  if (!(row.sku ?? "").trim() && !(row.name ?? "").trim()) return null
  const lc = (row.lifecycle ?? "active").toLowerCase()
  const lifecycle =
    lc === "inactive" || lc === "archived" ? lc : "active"
  return {
    srNo: finalSr,
    sku: row.sku ?? "",
    name: row.name ?? "",
    category: row.category ?? "",
    status: row.status ?? "In Stock",
    stock: Number(row.stock) || 0,
    orders: Number(row.orders) || 0,
    price: row.price ?? "0",
    supplier: (row.supplier ?? "").trim() || "Assign supplier",
    lifecycle,
  }
}

const chartData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
]

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--primary)",
  },
  mobile: {
    label: "Mobile",
    color: "var(--primary)",
  },
} satisfies ChartConfig

function ProductCellViewer({ item }: { item: ProductRow }) {
  const isMobile = useIsMobile()

  return (
    <Drawer direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild>
        <Button variant="link" className="text-foreground w-fit px-0 text-left">
          {item.name}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <DrawerTitle>{item.name}</DrawerTitle>
          <DrawerDescription>
            SKU {item.sku} · {item.category}
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
          {!isMobile && (
            <>
              <ChartContainer config={chartConfig}>
                <AreaChart
                  accessibilityLayer
                  data={chartData}
                  margin={{ left: 0, right: 10 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => value.slice(0, 3)}
                    hide
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <Area
                    dataKey="mobile"
                    type="natural"
                    fill="var(--color-mobile)"
                    fillOpacity={0.6}
                    stroke="var(--color-mobile)"
                    stackId="a"
                  />
                  <Area
                    dataKey="desktop"
                    type="natural"
                    fill="var(--color-desktop)"
                    fillOpacity={0.4}
                    stroke="var(--color-desktop)"
                    stackId="a"
                  />
                </AreaChart>
              </ChartContainer>
              <Separator />
              <div className="grid gap-2">
                <div className="flex gap-2 font-medium leading-none">
                  Orders trending for this SKU{" "}
                  <IconTrendingUp className="size-4" />
                </div>
                <div className="text-muted-foreground">
                  Summary chart mirrors the dashboard product table pattern. Hook
                  your sales API here when ready.
                </div>
              </div>
              <Separator />
            </>
          )}
          <form className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor={`sku-${item.srNo}`}>SKU</Label>
                <Input id={`sku-${item.srNo}`} defaultValue={item.sku} />
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor={`name-${item.srNo}`}>Name</Label>
                <Input id={`name-${item.srNo}`} defaultValue={item.name} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor={`category-${item.srNo}`}>Category</Label>
                <Select defaultValue={item.category}>
                  <SelectTrigger id={`category-${item.srNo}`} className="w-full">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Electronics">Electronics</SelectItem>
                    <SelectItem value="Accessories">Accessories</SelectItem>
                    <SelectItem value="Furniture">Furniture</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor={`status-${item.srNo}`}>Status</Label>
                <Select defaultValue={item.status}>
                  <SelectTrigger id={`status-${item.srNo}`} className="w-full">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="In Stock">In Stock</SelectItem>
                    <SelectItem value="Low Stock">Low Stock</SelectItem>
                    <SelectItem value="Out of Stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor={`stock-${item.srNo}`}>Stock</Label>
                <Input
                  id={`stock-${item.srNo}`}
                  type="number"
                  defaultValue={item.stock}
                />
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor={`orders-${item.srNo}`}>Orders (period)</Label>
                <Input
                  id={`orders-${item.srNo}`}
                  type="number"
                  defaultValue={item.orders}
                />
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor={`price-${item.srNo}`}>Unit price</Label>
              <Input id={`price-${item.srNo}`} defaultValue={item.price} />
            </div>
          </form>
        </div>
        <DrawerFooter>
          <Button>Save product</Button>
          <DrawerClose asChild>
            <Button variant="outline">Done</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

const productColumns: ColumnDef<ProductRow>[] = [
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
    accessorKey: "name",
    header: "Product",
    cell: ({ row }) => <ProductCellViewer item={row.original} />,
    enableHiding: false,
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => (
      <div className="w-32">
        <Badge variant="outline" className="text-muted-foreground px-1.5">
          {row.original.category}
        </Badge>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status
      const isInStock = status === "In Stock"
      const isLowStock = status === "Low Stock"
      const isOutOfStock = status === "Out of Stock"
      return (
        <Badge variant="outline" className="text-muted-foreground px-1.5">
          {isInStock ? (
            <IconCircleCheckFilled className="mr-1 fill-green-500 dark:fill-green-400" />
          ) : isLowStock ? (
            <IconAlertTriangleFilled className="mr-1 fill-amber-500 dark:fill-amber-400" />
          ) : isOutOfStock ? (
            <IconCircleXFilled className="mr-1 fill-red-500 dark:fill-red-400" />
          ) : null}
          {status}
        </Badge>
      )
    },
  },
  {
    accessorKey: "stock",
    header: () => (
      <div className="flex w-full justify-center text-center">Stock</div>
    ),
    cell: ({ row }) => (
      <form
        className="flex justify-center"
        onSubmit={(e) => {
          e.preventDefault()
          toast.promise(new Promise((resolve) => setTimeout(resolve, 1000)), {
            loading: `Saving stock for ${row.original.name}`,
            success: "Saved",
            error: "Error",
          })
        }}
      >
        <Label htmlFor={`${row.original.srNo}-stock-inline`} className="sr-only">
          Stock
        </Label>
        <Input
          className="hover:bg-input/30 focus-visible:bg-background dark:hover:bg-input/30 dark:focus-visible:bg-input/30 h-8 w-16 border-transparent bg-transparent text-center shadow-none focus-visible:border dark:bg-transparent"
          defaultValue={String(row.original.stock)}
          id={`${row.original.srNo}-stock-inline`}
        />
      </form>
    ),
  },
  {
    accessorKey: "price",
    header: () => (
      <div className="flex w-full justify-center text-center">Price</div>
    ),
    cell: ({ row }) => (
      <form
        className="flex justify-center"
        onSubmit={(e) => {
          e.preventDefault()
          toast.promise(new Promise((resolve) => setTimeout(resolve, 1000)), {
            loading: `Saving price for ${row.original.name}`,
            success: "Saved",
            error: "Error",
          })
        }}
      >
        <Label htmlFor={`${row.original.srNo}-price-inline`} className="sr-only">
          Price
        </Label>
        <Input
          className="hover:bg-input/30 focus-visible:bg-background dark:hover:bg-input/30 dark:focus-visible:bg-input/30 h-8 w-20 border-transparent bg-transparent text-center shadow-none focus-visible:border dark:bg-transparent"
          defaultValue={row.original.price}
          id={`${row.original.srNo}-price-inline`}
        />
      </form>
    ),
  },
  {
    accessorKey: "supplier",
    header: "Supplier",
    cell: ({ row }) => {
      const v = row.original.supplier
      const isSet = v !== "Assign supplier"
      if (isSet) {
        return v
      }
      return (
        <>
          <Label htmlFor={`${row.original.srNo}-supplier`} className="sr-only">
            Supplier
          </Label>
          <Select>
            <SelectTrigger
              className="w-38 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate"
              size="sm"
              id={`${row.original.srNo}-supplier`}
            >
              <SelectValue placeholder="Assign supplier" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="TechSupply Co.">TechSupply Co.</SelectItem>
              <SelectItem value="AccessWorld">AccessWorld</SelectItem>
              <SelectItem value="DisplayWorks">DisplayWorks</SelectItem>
              <SelectItem value="CarryAll Ltd.">CarryAll Ltd.</SelectItem>
              <SelectItem value="SoundGear Inc.">SoundGear Inc.</SelectItem>
            </SelectContent>
          </Select>
        </>
      )
    },
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
          <DropdownMenuItem>Duplicate</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]

export default function ProductsPage() {
  const rows = data as ProductRow[]

  return (
    <DataTable
      data={rows}
      columns={productColumns}
      addButtonLabel="Add product"
      searchPlaceholder="Search products..."
      importRowMapper={mapImportedProduct}
      importSampleFilename="products-sample.csv"
      exportFilename="products-export.csv"
      bulkActions={[
        {
          id: "archive",
          label: "Move to archive",
          icon: <IconArchive className="size-4" />,
          onClick: (selected) => {
            toast.message(
              `Moved ${selected.length} product(s) to archive (demo).`
            )
          },
        },
        {
          id: "delete",
          label: "Delete selected",
          icon: <IconTrash className="size-4" />,
          variant: "destructive",
          onClick: (selected) => {
            toast.message(`Would delete ${selected.length} product(s).`)
          },
        },
      ]}
      tabs={productTabs}
      defaultTab="active"
      tabFilter={productTabFilter}
    />
  )
}
