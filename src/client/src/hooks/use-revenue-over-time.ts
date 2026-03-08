import { useQuery } from "@tanstack/react-query";
import { authFetch } from "@/lib/authFetch";

export type RevenueOverTimeData = {
  from_date: string;
  to_date: string;
  group_by: string;
  data: { period: string; revenue: number }[];
};

function getMonthStart(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function getMonthEnd(d: Date): string {
  const next = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return next.toISOString().slice(0, 10);
}

function getYearStart(d: Date): string {
  return `${d.getFullYear()}-01-01`;
}

function getYearEnd(d: Date): string {
  return `${d.getFullYear()}-12-31`;
}

export type RevenuePeriodPreset =
  | "this_month"
  | "last_month"
  | "this_year"
  | "last_year"
  | "custom";

export function getPresetDates(
  preset: RevenuePeriodPreset,
  customFrom?: string,
  customTo?: string
): { from_date: string; to_date: string; group_by: "day" | "month" | "year" } {
  const now = new Date();
  switch (preset) {
    case "this_month": {
      const from = getMonthStart(now);
      const to = getMonthEnd(now);
      return { from_date: from, to_date: to, group_by: "day" };
    }
    case "last_month": {
      const last = new Date(now.getFullYear(), now.getMonth() - 1);
      return {
        from_date: getMonthStart(last),
        to_date: getMonthEnd(last),
        group_by: "day",
      };
    }
    case "this_year": {
      return {
        from_date: getYearStart(now),
        to_date: getYearEnd(now),
        group_by: "month",
      };
    }
    case "last_year": {
      const y = now.getFullYear() - 1;
      return {
        from_date: `${y}-01-01`,
        to_date: `${y}-12-31`,
        group_by: "month",
      };
    }
    case "custom":
    default: {
      const from = customFrom || getMonthStart(now);
      const to = customTo || getMonthEnd(now);
      const fromD = new Date(from);
      const toD = new Date(to);
      const days = Math.round((toD.getTime() - fromD.getTime()) / (24 * 60 * 60 * 1000));
      const group_by: "day" | "month" | "year" =
        days <= 31 ? "day" : days <= 365 ? "month" : "year";
      return { from_date: from, to_date: to, group_by };
    }
  }
}

const REVENUE_OVER_TIME_PATH = "/api/analytics/revenue-over-time";

export function useRevenueOverTime(
  fromDate: string,
  toDate: string,
  groupBy: "day" | "month" | "year"
) {
  return useQuery({
    queryKey: [REVENUE_OVER_TIME_PATH, fromDate, toDate, groupBy],
    queryFn: async (): Promise<RevenueOverTimeData> => {
      const params = new URLSearchParams({
        from_date: fromDate,
        to_date: toDate,
        group_by: groupBy,
      });
      const res = await authFetch(`${REVENUE_OVER_TIME_PATH}?${params}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to fetch revenue");
      }
      const raw = (await res.json()) as Record<string, unknown>;
      const data = (raw?.data as { period: string; revenue: number }[]) || [];
      return {
        from_date: String(raw?.from_date ?? fromDate),
        to_date: String(raw?.to_date ?? toDate),
        group_by: String(raw?.group_by ?? groupBy),
        data: data.map((d) => ({
          period: String(d?.period ?? ""),
          revenue: Number(d?.revenue ?? 0),
        })),
      };
    },
    enabled: !!fromDate && !!toDate,
  });
}
