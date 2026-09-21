"use client"

import * as React from "react"

import { CustomerTimelineSeeder } from "@/components/customers/customer-timeline-seeder"
import { VendorTimelineSeeder } from "@/components/vendors/vendor-timeline-seeder"
import { CustomersProvider } from "@/context/customers-context"
import { DepartmentsProvider } from "@/context/employee-departments-context"
import { LeavesProvider } from "@/context/employee-leaves-context"
import { PayrollProvider } from "@/context/employee-payroll-context"
import { EmployeesProvider } from "@/context/employees-context"
import { FiscalTermProvider } from "@/context/fiscal-term-context"
import { OrdersProvider } from "@/context/orders-context"
import { PaymentsProvider } from "@/context/payments-context"
import { PosSettingsProvider } from "@/context/pos-settings-context"
import { ProductsProvider } from "@/context/products-context"
import { PurchasesProvider } from "@/context/purchases-context"
import { ReturnsProvider } from "@/context/returns-context"
import { TaxSettingsProvider } from "@/context/tax-settings-context"
import { VendorsProvider } from "@/context/vendors-context"
import { ZakatProvider } from "@/context/zakat-context"

export function DashboardProviders({ children }: { children: React.ReactNode }) {
  return (
    <FiscalTermProvider>
      <TaxSettingsProvider>
        <EmployeesProvider>
          <DepartmentsProvider>
            <PayrollProvider>
              <LeavesProvider>
                <CustomersProvider>
                  <VendorsProvider>
                    <OrdersProvider>
                      <PosSettingsProvider>
                        <PurchasesProvider>
                          <ReturnsProvider>
                            <CustomerTimelineSeeder />
                            <VendorTimelineSeeder />
                            <PaymentsProvider>
                              <ProductsProvider>
                                <ZakatProvider>{children}</ZakatProvider>
                              </ProductsProvider>
                            </PaymentsProvider>
                          </ReturnsProvider>
                        </PurchasesProvider>
                      </PosSettingsProvider>
                    </OrdersProvider>
                  </VendorsProvider>
                </CustomersProvider>
              </LeavesProvider>
            </PayrollProvider>
          </DepartmentsProvider>
        </EmployeesProvider>
      </TaxSettingsProvider>
    </FiscalTermProvider>
  )
}
