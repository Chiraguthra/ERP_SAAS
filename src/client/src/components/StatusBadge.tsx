import { cn } from "@/lib/utils";
import { getStatusLabel } from "@/lib/orderStatus";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  partial_dispatched: "bg-violet-50 text-violet-700 border-violet-200",
  delivered: "bg-green-50 text-green-700 border-green-200",
  dispatched: "bg-blue-50 text-blue-700 border-blue-200",
  return: "bg-red-50 text-red-700 border-red-200",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const key = (status || "").toLowerCase();
  const currentStyle = STATUS_STYLES[key] || STATUS_STYLES.pending;

  return (
    <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold border", currentStyle, className)}>
      {getStatusLabel(status)}
    </span>
  );
}
