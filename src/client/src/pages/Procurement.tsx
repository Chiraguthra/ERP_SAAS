import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authFetch } from "@/lib/authFetch";
import { formatINR } from "@/lib/currency";
import { Loader2, Truck, FileText, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function Procurement() {
  const vendorsQuery = useQuery({
    queryKey: ["/api/vendors"],
    queryFn: async () => {
      const r = await authFetch("/api/vendors");
      if (!r.ok) throw new Error("Failed to load");
      const j = await r.json();
      return (j as { vendors?: { id: number; name: string; company?: string; gstin?: string }[] }).vendors ?? [];
    },
  });

  const poQuery = useQuery({
    queryKey: ["/api/purchase-orders"],
    queryFn: async () => {
      const r = await authFetch("/api/purchase-orders");
      if (!r.ok) throw new Error("Failed to load");
      const j = await r.json();
      return (j as { purchase_orders?: { id: number; number: string; vendor_id: number; date: string; status: string; total_amount: number }[] }).purchase_orders ?? [];
    },
  });

  const prQuery = useQuery({
    queryKey: ["/api/purchase-requests"],
    queryFn: async () => {
      const r = await authFetch("/api/purchase-requests");
      if (!r.ok) throw new Error("Failed to load");
      const j = await r.json();
      return (j as { purchase_requests?: { id: number; number: string; date: string; status: string }[] }).purchase_requests ?? [];
    },
  });

  const viQuery = useQuery({
    queryKey: ["/api/vendor-invoices"],
    queryFn: async () => {
      const r = await authFetch("/api/vendor-invoices");
      if (!r.ok) throw new Error("Failed to load");
      const j = await r.json();
      return (j as { vendor_invoices?: { id: number; number: string; vendor_id: number; date: string; total_amount: number; match_status?: string }[] }).vendor_invoices ?? [];
    },
  });

  const isLoading = vendorsQuery.isLoading || poQuery.isLoading;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-display font-bold">Procurement</h2>
          <p className="text-muted-foreground">Vendors, Purchase Requests, Purchase Orders, Vendor Invoices</p>
        </div>
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {!isLoading && (
          <Tabs defaultValue="vendors">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="vendors">Vendors</TabsTrigger>
              <TabsTrigger value="pr">Purchase Requests</TabsTrigger>
              <TabsTrigger value="po">Purchase Orders</TabsTrigger>
              <TabsTrigger value="vi">Vendor Invoices</TabsTrigger>
            </TabsList>
            <TabsContent value="vendors">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5" /> Vendors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-2">Name</th>
                          <th className="text-left p-2">Company</th>
                          <th className="text-left p-2">GSTIN</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(vendorsQuery.data ?? []).map((v) => (
                          <tr key={v.id} className="border-b">
                            <td className="p-2">{v.name}</td>
                            <td className="p-2">{v.company ?? "—"}</td>
                            <td className="p-2">{v.gstin ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="pr">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Purchase Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-2">Number</th>
                          <th className="text-left p-2">Date</th>
                          <th className="text-left p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(prQuery.data ?? []).map((p) => (
                          <tr key={p.id} className="border-b">
                            <td className="p-2">{p.number}</td>
                            <td className="p-2">{p.date}</td>
                            <td className="p-2">{p.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="po">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> Purchase Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-2">Number</th>
                          <th className="text-left p-2">Vendor ID</th>
                          <th className="text-left p-2">Date</th>
                          <th className="text-left p-2">Status</th>
                          <th className="text-right p-2">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(poQuery.data ?? []).map((p) => (
                          <tr key={p.id} className="border-b">
                            <td className="p-2">{p.number}</td>
                            <td className="p-2">{p.vendor_id}</td>
                            <td className="p-2">{p.date}</td>
                            <td className="p-2">{p.status}</td>
                            <td className="text-right p-2">{formatINR(p.total_amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="vi">
              <Card>
                <CardHeader>
                  <CardTitle>Vendor Invoices (3-way match)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-2">Number</th>
                          <th className="text-left p-2">Vendor ID</th>
                          <th className="text-left p-2">Date</th>
                          <th className="text-right p-2">Total</th>
                          <th className="text-left p-2">Match</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(viQuery.data ?? []).map((i) => (
                          <tr key={i.id} className="border-b">
                            <td className="p-2">{i.number}</td>
                            <td className="p-2">{i.vendor_id}</td>
                            <td className="p-2">{i.date}</td>
                            <td className="text-right p-2">{formatINR(i.total_amount)}</td>
                            <td className="p-2">{i.match_status ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </Layout>
  );
}
