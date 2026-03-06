import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { authFetch } from "@/lib/authFetch";
import { Loader2, Truck, Package, MapPin, BarChart3, Boxes, Filter, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
const MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => ({
  value: String(currentYear - i),
  label: String(currentYear - i),
}));

export default function LogisticsDashboard() {
  const [filterType, setFilterType] = useState<"month" | "range">("month");
  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [appliedFilters, setAppliedFilters] = useState<{
    type: "month" | "range";
    year?: string;
    month?: string;
    fromDate?: string;
    toDate?: string;
  }>({ type: "month", year: String(currentYear), month: String(new Date().getMonth() + 1) });

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    if (appliedFilters.type === "month" && appliedFilters.year) {
      params.set("year", appliedFilters.year);
      if (appliedFilters.month) {
        params.set("month", appliedFilters.month);
      }
    } else if (appliedFilters.type === "range") {
      if (appliedFilters.fromDate) params.set("from_date", appliedFilters.fromDate);
      if (appliedFilters.toDate) params.set("to_date", appliedFilters.toDate);
    }
    return params.toString();
  };

  const query = useQuery({
    queryKey: ["/api/logistics/dashboard/summary", appliedFilters],
    queryFn: async () => {
      const qs = buildQueryParams();
      const url = `/api/logistics/dashboard/summary${qs ? `?${qs}` : ""}`;
      const r = await authFetch(url);
      if (!r.ok) throw new Error("Failed to load");
      return r.json();
    },
  });

  const applyFilters = () => {
    if (filterType === "month") {
      setAppliedFilters({ type: "month", year: selectedYear, month: selectedMonth });
    } else {
      setAppliedFilters({ type: "range", fromDate, toDate });
    }
  };

  const clearFilters = () => {
    setFilterType("month");
    setSelectedYear(String(currentYear));
    setSelectedMonth(String(new Date().getMonth() + 1));
    setFromDate("");
    setToDate("");
    setAppliedFilters({ type: "month", year: String(currentYear), month: String(new Date().getMonth() + 1) });
  };

  const data = query.data as {
    total_entries?: number;
    total_distance?: number;
    total_quantity?: number;
    by_month?: { year: number; month: number; count: number; total_distance: number; total_quantity: number }[];
    by_product?: { product_name: string; product_unit: string; count: number; total_distance: number; total_quantity: number }[];
    by_distance?: { range: string; count: number; total_quantity: number }[];
  } | undefined;

  const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthData = (data?.by_month ?? []).map((m) => ({
    name: `${monthNames[m.month]} ${m.year}`,
    entries: m.count,
    distance: m.total_distance,
    quantity: m.total_quantity,
  })).reverse();

  const productData = (data?.by_product ?? []).slice(0, 6).map((p, i) => ({
    name: p.product_name,
    value: p.total_quantity,
    fill: COLORS[i % COLORS.length],
  }));

  const distanceData = (data?.by_distance ?? []).map((d, i) => ({
    name: d.range,
    count: d.count,
    quantity: d.total_quantity,
    fill: COLORS[i % COLORS.length],
  }));

  const getFilterDescription = () => {
    if (appliedFilters.type === "month" && appliedFilters.year && appliedFilters.month) {
      const monthName = MONTHS.find(m => m.value === appliedFilters.month)?.label ?? "";
      return `${monthName} ${appliedFilters.year}`;
    } else if (appliedFilters.type === "range" && (appliedFilters.fromDate || appliedFilters.toDate)) {
      return `${appliedFilters.fromDate || "..."} to ${appliedFilters.toDate || "..."}`;
    }
    return "All Time";
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-display font-bold">Logistics Dashboard</h2>
          <p className="text-muted-foreground">Aggregate summary by month, product, distance, and quantity</p>
        </div>

        {/* Filter Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5" /> Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Filter Type</label>
                <Select value={filterType} onValueChange={(v) => setFilterType(v as "month" | "range")}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">By Month</SelectItem>
                    <SelectItem value="range">Date Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filterType === "month" && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Year</label>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {YEARS.map((y) => (
                          <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Month</label>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {filterType === "range" && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">From Date</label>
                    <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">To Date</label>
                    <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-40" />
                  </div>
                </>
              )}

              <Button onClick={applyFilters} className="btn-primary">
                Apply
              </Button>
              <Button variant="outline" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" /> Clear
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              Showing data for: <span className="font-medium text-foreground">{getFilterDescription()}</span>
            </p>
          </CardContent>
        </Card>

        {query.isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {!query.isLoading && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
                  <Truck className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data?.total_entries ?? 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
                  <Boxes className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(data?.total_quantity ?? 0).toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Distance</CardTitle>
                  <MapPin className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(data?.total_distance ?? 0).toLocaleString()} km</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Products Tracked</CardTitle>
                  <Package className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data?.by_product?.length ?? 0}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Quantity by Month</CardTitle>
                </CardHeader>
                <CardContent>
                  {monthData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={monthData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="quantity" fill="#22c55e" name="Quantity" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No data</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quantity by Product</CardTitle>
                </CardHeader>
                <CardContent>
                  {productData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={productData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                          {productData.map((entry, index) => (
                            <Cell key={index} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No data</p>
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Quantity by Distance Range (km)</CardTitle>
                </CardHeader>
                <CardContent>
                  {distanceData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={distanceData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={80} />
                        <Tooltip />
                        <Bar dataKey="quantity" name="Quantity">
                          {distanceData.map((entry, index) => (
                            <Cell key={index} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No data</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Products Report with Totals */}
            <Card>
              <CardHeader>
                <CardTitle>Products Summary ({getFilterDescription()})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3">Product</th>
                        <th className="text-left p-3">Unit</th>
                        <th className="text-right p-3">Entries</th>
                        <th className="text-right p-3">Total Quantity</th>
                        <th className="text-right p-3">Total Distance (km)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.by_product ?? []).map((p) => (
                        <tr key={`${p.product_name}-${p.product_unit}`} className="border-b">
                          <td className="p-3 font-medium">{p.product_name}</td>
                          <td className="p-3 text-muted-foreground">{p.product_unit || "—"}</td>
                          <td className="text-right p-3">{p.count}</td>
                          <td className="text-right p-3">{p.total_quantity.toLocaleString()}</td>
                          <td className="text-right p-3">{p.total_distance.toLocaleString()}</td>
                        </tr>
                      ))}
                      {(data?.by_product ?? []).length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center text-muted-foreground py-8">No data for selected period</td>
                        </tr>
                      )}
                    </tbody>
                    {(data?.by_product ?? []).length > 0 && (
                      <tfoot>
                        <tr className="bg-muted/70 font-semibold">
                          <td className="p-3" colSpan={2}>TOTAL</td>
                          <td className="text-right p-3">{data?.total_entries ?? 0}</td>
                          <td className="text-right p-3">{(data?.total_quantity ?? 0).toLocaleString()}</td>
                          <td className="text-right p-3">{(data?.total_distance ?? 0).toLocaleString()}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}
