import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/authFetch";
import { formatINR } from "@/lib/currency";
import { Loader2, Download, BarChart3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function Reports() {
  const financialQuery = useQuery({
    queryKey: ["/api/reports/financial-summary"],
    queryFn: async () => {
      const from = new Date();
      from.setMonth(from.getMonth() - 1);
      const to = new Date();
      const r = await authFetch(`/api/reports/financial-summary?from_date=${from.toISOString().slice(0, 10)}&to_date=${to.toISOString().slice(0, 10)}`);
      if (!r.ok) throw new Error("Failed to load");
      return r.json();
    },
  });

  const salesQuery = useQuery({
    queryKey: ["/api/reports/sales-summary"],
    queryFn: async () => {
      const r = await authFetch("/api/reports/sales-summary");
      if (!r.ok) throw new Error("Failed to load");
      return r.json();
    },
  });

  const inventoryQuery = useQuery({
    queryKey: ["/api/reports/inventory-summary"],
    queryFn: async () => {
      const r = await authFetch("/api/reports/inventory-summary");
      if (!r.ok) throw new Error("Failed to load");
      return r.json();
    },
  });

  const download = async (url: string, filename: string) => {
    const r = await authFetch(url);
    if (!r.ok) return;
    const blob = await r.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const downloadSales = () => download("/api/reports/export/sales", "sales-report.csv");
  const downloadInventory = () => download("/api/reports/export/inventory", "inventory-report.csv");
  const downloadTrialBalance = () => {
    const asOf = new Date().toISOString().slice(0, 10);
    download(`/api/reports/export/trial-balance?as_of=${asOf}`, `trial-balance-${asOf}.csv`);
  };

  const isLoading = financialQuery.isLoading || salesQuery.isLoading || inventoryQuery.isLoading;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-display font-bold">Reports & Export</h2>
          <p className="text-muted-foreground">Financial, sales, inventory reports and Excel/CSV export</p>
        </div>
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {!isLoading && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Financial (Period)</CardTitle>
                  <BarChart3 className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold">{formatINR((financialQuery.data as { profit?: number })?.profit ?? 0)}</div>
                  <p className="text-xs text-muted-foreground">Profit (Revenue − Expense)</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Sales Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold">{(salesQuery.data as { order_count?: number })?.order_count ?? 0} orders</div>
                  <p className="text-xs text-muted-foreground">{formatINR((salesQuery.data as { total_revenue?: number })?.total_revenue ?? 0)} revenue</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Inventory Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold">{(inventoryQuery.data as { product_count?: number })?.product_count ?? 0} products</div>
                  <p className="text-xs text-muted-foreground">{formatINR((inventoryQuery.data as { total_value?: number })?.total_value ?? 0)} value</p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Export to CSV / Excel</CardTitle>
                <p className="text-sm text-muted-foreground">Download reports as CSV (open in Excel).</p>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                <Button variant="outline" onClick={downloadSales}>
                  <Download className="mr-2 h-4 w-4" />
                  Sales Report
                </Button>
                <Button variant="outline" onClick={downloadInventory}>
                  <Download className="mr-2 h-4 w-4" />
                  Inventory Report
                </Button>
                <Button variant="outline" onClick={downloadTrialBalance}>
                  <Download className="mr-2 h-4 w-4" />
                  Trial Balance
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}
