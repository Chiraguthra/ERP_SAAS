/** Format amount in INR (Indian Rupees) */
export const CURRENCY_SYMBOL = "₹";

export function formatINR(amount: number | string): string {
  const n = Number(amount);
  if (Number.isNaN(n)) return `${CURRENCY_SYMBOL}0.00`;
  return `${CURRENCY_SYMBOL}${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
