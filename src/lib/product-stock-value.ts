/** Current stock value is sale price times quantity on hand. */
export function productStockValue(salePrice: string | number, stock: number): string {
  const price = Number(salePrice)
  const qty = Number(stock)
  const value =
    (Number.isFinite(price) ? price : 0) * (Number.isFinite(qty) ? qty : 0)
  return value.toFixed(2)
}
