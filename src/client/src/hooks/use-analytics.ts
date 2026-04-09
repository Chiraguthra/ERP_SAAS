import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { authFetch } from "@/lib/authFetch";
import { fiscalYearLabel, indianFyStartYearFromDate } from "@/lib/fiscalYear";

type AnalyticsData = {
  fiscalYearStart: number;
  fiscalYearLabel: string;
  fiscalYearFrom: string;
  fiscalYearTo: string;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  statusCounts: Record<string, number>;
  topProducts: { name: string; quantity: number }[];
  orderFunnel: Record<string, number>;
  orderAging: Record<string, number>;
  topCustomers: { id: number; name: string; orders: number; revenue: number }[];
  repeatCustomerRate: number;
  inventoryHealth: {
    inventoryValue: number;
    lowStockCount: number;
    deadStockCount: number;
    deadStockValue: number;
  };
  deliveryPerformance: {
    deliveredRate: number;
    avgDispatchToDeliveryHours: number;
  };
};

function toNumber(v: unknown): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") return Number(v) || 0;
  return 0;
}

function toRecord(v: unknown): Record<string, number> {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    const out: Record<string, number> = {};
    for (const [k, val] of Object.entries(v)) {
      out[String(k)] = toNumber(val);
    }
    return out;
  }
  return {};
}

function toTopProducts(v: unknown): { name: string; quantity: number }[] {
  if (!Array.isArray(v)) return [];
  return v.map((item) => {
    const o = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      name: typeof o.name === "string" ? o.name : String(o.name ?? ""),
      quantity: toNumber(o.quantity),
    };
  });
}

function toTopCustomers(v: unknown): { id: number; name: string; orders: number; revenue: number }[] {
  if (!Array.isArray(v)) return [];
  return v.map((item) => {
    const o = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return {
      id: toNumber(o.id),
      name: typeof o.name === "string" ? o.name : String(o.name ?? ""),
      orders: toNumber(o.orders),
      revenue: toNumber(o.revenue),
    };
  });
}

function toFiscalMeta(raw: Record<string, unknown>, fallbackStart: number): Pick<
  AnalyticsData,
  "fiscalYearStart" | "fiscalYearLabel" | "fiscalYearFrom" | "fiscalYearTo"
> {
  const start = toNumber(raw?.fiscalYearStart ?? raw?.fiscal_year_start) || fallbackStart;
  const labelRaw = raw?.fiscalYearLabel ?? raw?.fiscal_year_label;
  const label = typeof labelRaw === "string" && labelRaw ? labelRaw : fiscalYearLabel(start);
  const from = String(raw?.fiscalYearFrom ?? raw?.fiscal_year_from ?? "").trim();
  const to = String(raw?.fiscalYearTo ?? raw?.fiscal_year_to ?? "").trim();
  return {
    fiscalYearStart: start,
    fiscalYearLabel: label,
    fiscalYearFrom: from,
    fiscalYearTo: to,
  };
}

export function useAnalytics(fy?: number | null) {
  const qs = fy != null && !Number.isNaN(Number(fy)) ? `?fy=${encodeURIComponent(String(fy))}` : "";
  return useQuery({
    queryKey: [api.analytics.get.path, fy ?? "default"],
    queryFn: async (): Promise<AnalyticsData> => {
      const res = await authFetch(`${api.analytics.get.path}${qs}`);
      if (!res.ok) {
        const text = await res.text();
        if (res.status === 401) throw new Error("Please log in again.");
        throw new Error(text || `Failed to fetch analytics (${res.status})`);
      }
      const raw = (await res.json()) as Record<string, unknown>;
      const fyFallback =
        fy != null && !Number.isNaN(Number(fy)) ? Number(fy) : indianFyStartYearFromDate();
      const fiscal = toFiscalMeta(raw, fyFallback);
      return {
        ...fiscal,
        totalOrders: toNumber(raw?.totalOrders ?? raw?.total_orders),
        totalRevenue: toNumber(raw?.totalRevenue ?? raw?.total_revenue),
        averageOrderValue: toNumber(raw?.averageOrderValue ?? raw?.average_order_value),
        statusCounts: toRecord(raw?.statusCounts ?? raw?.status_counts),
        topProducts: toTopProducts(raw?.topProducts ?? raw?.top_products),
        orderFunnel: toRecord(raw?.orderFunnel ?? raw?.order_funnel),
        orderAging: toRecord(raw?.orderAging ?? raw?.order_aging),
        topCustomers: toTopCustomers(raw?.topCustomers ?? raw?.top_customers),
        repeatCustomerRate: toNumber(raw?.repeatCustomerRate ?? raw?.repeat_customer_rate),
        inventoryHealth: {
          inventoryValue: toNumber((raw?.inventoryHealth as Record<string, unknown> | undefined)?.inventoryValue),
          lowStockCount: toNumber((raw?.inventoryHealth as Record<string, unknown> | undefined)?.lowStockCount),
          deadStockCount: toNumber((raw?.inventoryHealth as Record<string, unknown> | undefined)?.deadStockCount),
          deadStockValue: toNumber((raw?.inventoryHealth as Record<string, unknown> | undefined)?.deadStockValue),
        },
        deliveryPerformance: {
          deliveredRate: toNumber((raw?.deliveryPerformance as Record<string, unknown> | undefined)?.deliveredRate),
          avgDispatchToDeliveryHours: toNumber((raw?.deliveryPerformance as Record<string, unknown> | undefined)?.avgDispatchToDeliveryHours),
        },
      };
    },
    retry: false,
  });
}
