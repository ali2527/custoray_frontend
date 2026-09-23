import type { CustomerRow } from "@/lib/customers"
import { ordersForCustomer, type OrderRow } from "@/lib/orders"
import { returnsForCustomer, type ReturnRow } from "@/lib/returns"

export const CUSTOMER_TIMELINE_SEED_KEY = "custoray-customer-timeline-seed-v2"

export function customerTimelineSeedStorageKey(tenantId?: string | null) {
  return tenantId
    ? `${CUSTOMER_TIMELINE_SEED_KEY}:${tenantId}`
    : CUSTOMER_TIMELINE_SEED_KEY
}

function orderTemplates(name: string): Omit<OrderRow, "id">[] {
  return [
    {
      invoiceNumber: "",
      customerName: name,
      description: "Opening stock — dry goods",
      orderDate: "2026-06-12",
      totalAmount: "8200.00",
      paidAmount: "8200.00",
      paymentMethod: "Cash",
      status: "completed",
      lines: [
        {
          id: 1,
          productName: "All-purpose Flour 50kg",
          quantity: 4,
          unitPrice: "2050.00",
          lineTotal: "8200.00",
        },
      ],
    },
    {
      invoiceNumber: "",
      customerName: name,
      description: "Mid-month sugar restock",
      orderDate: "2026-06-28",
      totalAmount: "15400.00",
      paidAmount: "5000.00",
      paymentMethod: "Credit",
      status: "pending",
      lines: [
        {
          id: 1,
          productName: "White Sugar 10kg",
          quantity: 20,
          unitPrice: "770.00",
          lineTotal: "15400.00",
        },
      ],
    },
    {
      invoiceNumber: "",
      customerName: name,
      description: "Cooking oil pallet — paid in full",
      orderDate: "2026-07-08",
      totalAmount: "31000.00",
      paidAmount: "31000.00",
      paymentMethod: "Bank transfer",
      status: "completed",
      lines: [
        {
          id: 1,
          productName: "Cooking Oil 5L",
          quantity: 25,
          unitPrice: "1240.00",
          lineTotal: "31000.00",
        },
      ],
    },
    {
      invoiceNumber: "",
      customerName: name,
      description: "Cancelled — supplier shortage",
      orderDate: "2026-07-21",
      totalAmount: "4500.00",
      paidAmount: "0.00",
      paymentMethod: "Credit",
      status: "cancelled",
      lines: [
        {
          id: 1,
          productName: "Canned Tomatoes 2.5kg",
          quantity: 15,
          unitPrice: "300.00",
          lineTotal: "4500.00",
        },
      ],
    },
    {
      invoiceNumber: "",
      customerName: name,
      description: "Dairy drop — balance due",
      orderDate: "2026-07-29",
      totalAmount: "9600.00",
      paidAmount: "3600.00",
      paymentMethod: "Card",
      status: "pending",
      lines: [
        {
          id: 1,
          productName: "Full Cream Milk 1L x12",
          quantity: 8,
          unitPrice: "1200.00",
          lineTotal: "9600.00",
        },
      ],
    },
    {
      invoiceNumber: "",
      customerName: name,
      description: "Wholesale restock — mixed SKUs",
      orderDate: "2026-08-18",
      totalAmount: "45200.00",
      paidAmount: "45200.00",
      paymentMethod: "Bank transfer",
      status: "completed",
      lines: [
        {
          id: 1,
          productName: "Premium Basmati Rice 25kg",
          quantity: 8,
          unitPrice: "3200.00",
          lineTotal: "25600.00",
        },
        {
          id: 2,
          productName: "Sunflower Oil 5L",
          quantity: 12,
          unitPrice: "1100.00",
          lineTotal: "13200.00",
        },
        {
          id: 3,
          productName: "Mixed Spices Carton",
          quantity: 4,
          unitPrice: "1600.00",
          lineTotal: "6400.00",
        },
      ],
    },
    {
      invoiceNumber: "",
      customerName: name,
      description: "Late August beverages",
      orderDate: "2026-08-27",
      totalAmount: "6400.00",
      paidAmount: "0.00",
      paymentMethod: "Credit",
      status: "pending",
      lines: [
        {
          id: 1,
          productName: "Mineral Water 1.5L x12",
          quantity: 16,
          unitPrice: "400.00",
          lineTotal: "6400.00",
        },
      ],
    },
    {
      invoiceNumber: "",
      customerName: name,
      description: "Seasonal order — partial payment",
      orderDate: "2026-09-04",
      totalAmount: "18600.00",
      paidAmount: "8000.00",
      paymentMethod: "Credit",
      status: "pending",
      lines: [
        {
          id: 1,
          productName: "Organic Honey 500g",
          quantity: 12,
          unitPrice: "850.00",
          lineTotal: "10200.00",
        },
        {
          id: 2,
          productName: "Green Tea Box 100s",
          quantity: 20,
          unitPrice: "420.00",
          lineTotal: "8400.00",
        },
      ],
    },
    {
      invoiceNumber: "",
      customerName: name,
      description: "Express delivery",
      orderDate: "2026-09-15",
      totalAmount: "12400.00",
      paidAmount: "12400.00",
      paymentMethod: "Cash",
      status: "completed",
      lines: [
        {
          id: 1,
          productName: "Frozen Chicken 10kg",
          quantity: 10,
          unitPrice: "1240.00",
          lineTotal: "12400.00",
        },
      ],
    },
    {
      invoiceNumber: "",
      customerName: name,
      description: "Ramadan dry-fruit carton",
      orderDate: "2026-09-22",
      totalAmount: "7200.00",
      paidAmount: "0.00",
      paymentMethod: "Credit",
      status: "pending",
      lines: [
        {
          id: 1,
          productName: "Mixed Dry Fruit 1kg",
          quantity: 8,
          unitPrice: "900.00",
          lineTotal: "7200.00",
        },
      ],
    },
  ]
}

function returnTemplates(
  name: string,
  created: OrderRow[]
): Omit<ReturnRow, "id">[] {
  const oil = created.find((row) => row.orderDate === "2026-07-08")
  const chicken = created.find((row) => row.orderDate === "2026-09-15")
  const rows: Omit<ReturnRow, "id">[] = []
  if (oil) {
    rows.push({
      returnNumber: "",
      type: "sales",
      sourceId: oil.id,
      referenceNumber: oil.invoiceNumber,
      partyName: name,
      returnDate: "2026-07-25",
      description: "Leaking oil bottles",
      totalAmount: "2480.00",
      refundedAmount: "2480.00",
      sourcePaidAmount: oil.paidAmount,
      sourceTotalBefore: oil.totalAmount,
      sourceTotalAfter: "28520.00",
      refundDue: "0.00",
      balanceDue: "0.00",
      status: "completed",
      lines: [
        {
          id: 1,
          sourceLineId: 1,
          productName: "Cooking Oil 5L",
          quantity: 2,
          maxQuantity: 25,
          unitPrice: "1240.00",
          lineTotal: "2480.00",
        },
      ],
    })
  }
  if (chicken) {
    rows.push({
      returnNumber: "",
      type: "sales",
      sourceId: chicken.id,
      referenceNumber: chicken.invoiceNumber,
      partyName: name,
      returnDate: "2026-09-17",
      description: "Partial return — damaged carton",
      totalAmount: "2480.00",
      refundedAmount: "2480.00",
      sourcePaidAmount: chicken.paidAmount,
      sourceTotalBefore: chicken.totalAmount,
      sourceTotalAfter: "9920.00",
      refundDue: "0.00",
      balanceDue: "0.00",
      status: "completed",
      lines: [
        {
          id: 1,
          sourceLineId: 1,
          productName: "Frozen Chicken 10kg",
          quantity: 2,
          maxQuantity: 10,
          unitPrice: "1240.00",
          lineTotal: "2480.00",
        },
      ],
    })
  }
  return rows
}

function nextInvoiceNumber(existing: OrderRow[], offset: number) {
  const nums = existing
    .map((row) => Number(row.invoiceNumber.replace(/\D/g, "")))
    .filter((n) => Number.isFinite(n))
  const max = nums.length ? Math.max(...nums) : 1000
  return `INV-${max + 1 + offset}`
}

function nextReturnNumber(existing: ReturnRow[], offset: number) {
  const nums = existing
    .map((row) => Number(row.returnNumber.replace(/\D/g, "")))
    .filter((n) => Number.isFinite(n))
  const max = nums.length ? Math.max(...nums) : 1000
  return `RET-${max + 1 + offset}`
}

function orderKey(row: Pick<OrderRow, "orderDate" | "totalAmount">) {
  return `${row.orderDate}|${row.totalAmount}`
}

function returnKey(row: Pick<ReturnRow, "returnDate" | "totalAmount">) {
  return `${row.returnDate}|${row.totalAmount}`
}

export function appendCustomerTimelineSeed(
  customers: Pick<CustomerRow, "id" | "name">[],
  orders: OrderRow[],
  returns: ReturnRow[]
): { orders: OrderRow[]; returns: ReturnRow[]; added: boolean } {
  const nextOrders = [...orders]
  const nextReturns = [...returns]
  let orderId = nextOrders.reduce((max, row) => Math.max(max, row.id), 0)
  let returnId = nextReturns.reduce((max, row) => Math.max(max, row.id), 0)
  let added = false

  for (const customer of customers) {
    const name = customer.name.trim()
    if (!name) continue

    const existingOrders = ordersForCustomer(nextOrders, name)
    const existingOrderKeys = new Set(existingOrders.map(orderKey))
    const missingOrders = orderTemplates(name).filter(
      (template) => !existingOrderKeys.has(orderKey(template))
    )

    let invoiceOffset = 0
    const created: OrderRow[] = missingOrders.map((template) => {
      orderId += 1
      const invoiceNumber = nextInvoiceNumber(nextOrders, invoiceOffset)
      invoiceOffset += 1
      return { ...template, id: orderId, invoiceNumber }
    })
    if (created.length) {
      nextOrders.push(...created)
      added = true
    }

    const allForCustomer = ordersForCustomer(nextOrders, name)
    const existingReturnKeys = new Set(
      returnsForCustomer(nextReturns, name).map(returnKey)
    )
    let returnOffset = 0
    for (const template of returnTemplates(name, allForCustomer)) {
      if (existingReturnKeys.has(returnKey(template))) continue
      returnId += 1
      nextReturns.push({
        ...template,
        id: returnId,
        returnNumber: nextReturnNumber(nextReturns, returnOffset),
      })
      returnOffset += 1
      added = true
    }
  }

  return { orders: nextOrders, returns: nextReturns, added }
}
