import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authFetch } from "@/lib/authFetch";
import { formatINR } from "@/lib/currency";
import { Loader2, Warehouse, AlertTriangle, BarChart3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function Warehouses() {
  const warehousesQuery = useQuery({
    queryKey: ["/api/warehouses"],
    queryFn: async () => {
      const r = await authFetch("/api/warehouses");
      if (!r.ok) throw new Error("Failed to load");
      const j = await r.json();
      return (j as { warehouses?: { id: number; name: string; code?: string; address?: string }[] }).warehouses ?? [];
    },
  });

  const valuationQuery = useQuery({
    queryKey: ["/api/inventory/valuation"],
    queryFn: async () => {
      const r = await authFetch("/api/inventory/valuation");
      if (!r.ok) throw new Error("Failed to load");
      return r.json();
    },
  });

  const reorderQuery = useQuery({
    queryKey: ["/api/inventory/reorder-alerts"],
    queryFn: async () => {
      const r = await authFetch("/api/inventory/reorder-alerts");
      if (!r.ok) throw new Error("Failed to load");
      const j = await r.json();
      return (j as { alerts?: { product_id: number; name: string; sku: string; stock: number; reorder_level: number }[] }).alerts ?? [];
    },
  });

  const isLoading = warehousesQuery.isLoading || valuationQuery.isLoading;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-display font-bold">Warehouses & Inventory</h2>
          <p className="text-muted-foreground">Warehouses, stock valuation, reorder alerts</p>
        </div>
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {!isLoading && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Stock Value</CardTitle>
                  <BarChart3 className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatINR((valuationQuery.data as { total_value?: number })?.total_value ?? 0)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Reorder Alerts</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(reorderQuery.data ?? []).length}</div>
                  <p className="text-xs text-muted-foreground">Products below reorder level</p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Warehouse className="h-5 w-5" /> Warehouses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2">Name</th>
                        <th className="text-left p-2">Code</th>
                        <th className="text-left p-2">Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(warehousesQuery.data ?? []).map((w) => (
                        <tr key={w.id} className="border-b">
                          <td className="p-2">{w.name}</td>
                          <td className="p-2">{w.code ?? "—"}</td>
                          <td className="p-2">{w.address ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Reorder Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2">Product</th>
                        <th className="text-left p-2">SKU</th>
                        <th className="text-right p-2">Stock</th>
                        <th className="text-right p-2">Reorder Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(reorderQuery.data ?? []).map((a) => (
                        <tr key={a.product_id} className="border-b">
                          <td className="p-2">{a.name}</td>
                          <td className="p-2">{a.sku}</td>
                          <td className="text-right p-2">{a.stock}</td>
                          <td className="text-right p-2">{a.reorder_level}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(!reorderQuery.data || reorderQuery.data.length === 0) && (
                    <p className="p-4 text-center text-muted-foreground">
                      No reorder alerts. Set reorder levels on products.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}
