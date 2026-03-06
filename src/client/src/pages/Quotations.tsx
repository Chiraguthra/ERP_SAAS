import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authFetch } from "@/lib/authFetch";
import { formatINR } from "@/lib/currency";
import { Loader2, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function Quotations() {
  const query = useQuery({
    queryKey: ["/api/quotations"],
    queryFn: async () => {
      const r = await authFetch("/api/quotations");
      if (!r.ok) throw new Error("Failed to load quotations");
      const j = await r.json();
      return (j as { quotations?: { id: number; number: string; customer_id: number; date: string; status: string; total_amount: number }[] }).quotations ?? [];
    },
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-display font-bold">Quotations</h2>
          <p className="text-muted-foreground">Create and manage sales quotations</p>
        </div>
        {query.isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {!query.isLoading && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> All Quotations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-2">Number</th>
                      <th className="text-left p-2">Customer ID</th>
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-right p-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(query.data ?? []).map((q) => (
                      <tr key={q.id} className="border-b">
                        <td className="p-2">{q.number}</td>
                        <td className="p-2">{q.customer_id}</td>
                        <td className="p-2">{q.date}</td>
                        <td className="p-2">{q.status}</td>
                        <td className="text-right p-2">{formatINR(q.total_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!query.data || query.data.length === 0) && (
                  <p className="p-4 text-center text-muted-foreground">No quotations yet. Create one via API or add a form here.</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
