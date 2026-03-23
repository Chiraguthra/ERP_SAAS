/** Allowed order statuses: value stored in API, label shown in UI */
export const ORDER_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "partial_dispatched", label: "Partial Dispatched" },
  { value: "delivered", label: "Delivered" },
  { value: "dispatched", label: "Dispatched" },
  { value: "return", label: "Return" },
] as const;

export type OrderStatusValue = typeof ORDER_STATUSES[number]["value"];

export function getStatusLabel(value: string): string {
  const found = ORDER_STATUSES.find((s) => s.value === value?.toLowerCase());
  return found ? found.label : value || "Pending";
}
