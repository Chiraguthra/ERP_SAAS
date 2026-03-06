import { Layout } from "@/components/Layout";
import { useAnalytics } from "@/hooks/use-analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, ShoppingBag, IndianRupee, Package, Users, Truck } from "lucide-react";
import { formatINR } from "@/lib/currency";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell 
} from "recharts";
import { useLocation } from "wouter";
import { getStatusLabel } from "@/lib/orderStatus";

const defaultAnalytics = {
  totalOrders: 0,
  totalRevenue: 0,
  averageOrderValue: 0,
  statusCounts: {} as Record<string, number>,
  topProducts: [] as { name: string; quantity: number }[],
  orderFunnel: {} as Record<string, number>,
  orderAging: {} as Record<string, number>,
  topCustomers: [] as { id: number; name: string; orders: number; revenue: number }[],
  repeatCustomerRate: 0,
  inventoryHealth: {
    inventoryValue: 0,
    lowStockCount: 0,
    deadStockCount: 0,
    deadStockValue: 0,
  },
  deliveryPerformance: {
    deliveredRate: 0,
    avgDispatchToDeliveryHours: 0,
  },
};

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data, isLoading, isError, error } = useAnalytics();

  if (isLoading) {
    return <Layout><div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div></Layout>;
  }

  const analytics = data ?? defaultAnalytics;
  const statusCounts = analytics.statusCounts ?? {};
  const chartData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  const topProducts = analytics.topProducts ?? [];
  const orderAging = analytics.orderAging ?? {};
  const topCustomers = analytics.topCustomers ?? [];
  const agingData = [
    { name: "0-3 days", value: orderAging.d0_3 ?? 0 },
    { name: "4-7 days", value: orderAging.d4_7 ?? 0 },
    { name: "8+ days", value: orderAging.d8_plus ?? 0 },
  ];
  const COLORS = ['#94a3b8', '#3b82f6', '#6366f1', '#f97316', '#22c55e', '#ef4444'];

  return (
    <Layout>
      <div className="space-y-8">
        {isError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error?.message ?? "Failed to load analytics."}
          </div>
        )}
        <div>
          <h2 className="text-3xl font-display font-bold">Dashboard</h2>
          <p className="text-muted-foreground">Overview of your business performance</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-lg shadow-black/5 border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <IndianRupee className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display">{formatINR(analytics.totalRevenue ?? 0)}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-green-500" /> From delivered orders
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg shadow-black/5 border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingBag className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display">{analytics.totalOrders ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across all statuses
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg shadow-black/5 border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Order Value</CardTitle>
              <Package className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display">{formatINR(analytics.averageOrderValue ?? 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Per delivered order
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts & Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="col-span-1 shadow-lg shadow-black/5">
            <CardHeader>
              <CardTitle>Order Status Distribution</CardTitle>
              <p className="text-xs text-muted-foreground font-normal mt-1">Click a bar to view orders with that status</p>
            </CardHeader>
            <CardContent className="h-[300px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} formatter={(value: number, name: string) => [value, getStatusLabel(name)]} />
                    <Bar
                      dataKey="value"
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                      onClick={(data: unknown) => {
                        const payload = data && typeof data === "object" && "payload" in data
                          ? (data as { payload?: { name?: string } }).payload
                          : data as { name?: string } | undefined;
                        const name = payload?.name ?? (data as { name?: string })?.name;
                        const status = (name ?? "").toLowerCase();
                        if (status) setLocation(`/orders?status=${encodeURIComponent(status)}`);
                      }}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                  No order status data yet
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-1 shadow-lg shadow-black/5">
            <CardHeader>
              <CardTitle>Top Selling Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topProducts.map((product, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        #{i + 1}
                      </div>
                      <span className="font-medium text-sm">{product.name}</span>
                    </div>
                    <span className="text-sm font-semibold">{product.quantity} sold</span>
                  </div>
                ))}
                {topProducts.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">No sales data yet</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick-win metrics */}
        <div className="grid grid-cols-1 gap-8">
          <Card className="shadow-lg shadow-black/5">
            <CardHeader>
              <CardTitle>Open Order Aging</CardTitle>
              <p className="text-xs text-muted-foreground font-normal mt-1">Orders not yet delivered/returned</p>
            </CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agingData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <RechartsTooltip cursor={{ fill: "transparent" }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {agingData.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-lg shadow-black/5 border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Repeat Customer Rate</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display">{(analytics.repeatCustomerRate ?? 0).toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-1">Customers with 2+ orders</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg shadow-black/5 border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
              <Truck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display">{(analytics.deliveryPerformance?.deliveredRate ?? 0).toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                Avg delivery cycle: {(analytics.deliveryPerformance?.avgDispatchToDeliveryHours ?? 0).toFixed(1)} hrs
              </p>
            </CardContent>
          </Card>

        </div>

        <div className="grid grid-cols-1 gap-8">
          <Card className="shadow-lg shadow-black/5">
            <CardHeader>
              <CardTitle>Top Customers (Delivered Revenue)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topCustomers.map((customer, i) => (
                  <div key={customer.id || i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        #{i + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate" title={customer.name}>{customer.name}</p>
                        <p className="text-xs text-muted-foreground">{customer.orders} delivered orders</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold">{formatINR(customer.revenue)}</span>
                  </div>
                ))}
                {topCustomers.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">No delivered customer revenue yet</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
