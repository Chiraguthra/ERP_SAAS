import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authFetch } from "@/lib/authFetch";
import { formatINR } from "@/lib/currency";
import { Loader2, Banknote, FileText, Scale, TrendingUp, Receipt } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

export default function Finance() {
  const [asOf] = useState(new Date().toISOString().slice(0, 10));
  const [fromDate] = useState(new Date().toISOString().slice(0, 10));
  const [toDate] = useState(new Date().toISOString().slice(0, 10));

  const coaQuery = useQuery({
    queryKey: ["/api/chart-of-accounts"],
    queryFn: async () => {
      const r = await authFetch("/api/chart-of-accounts");
      if (!r.ok) throw new Error("Failed to load");
      const j = await r.json();
      return j as { id: number; code: string; name: string; account_type: string }[];
    },
  });

  const trialBalanceQuery = useQuery({
    queryKey: ["/api/finance/trial-balance", asOf],
    queryFn: async () => {
      const r = await authFetch(`/api/finance/trial-balance?as_of=${asOf}`);
      if (!r.ok) throw new Error("Failed to load");
      return r.json();
    },
  });

  const plQuery = useQuery({
    queryKey: ["/api/finance/profit-loss", fromDate, toDate],
    queryFn: async () => {
      const r = await authFetch(`/api/finance/profit-loss?from_date=${fromDate}&to_date=${toDate}`);
      if (!r.ok) throw new Error("Failed to load");
      return r.json();
    },
  });

  const arQuery = useQuery({
    queryKey: ["/api/finance/accounts-receivable"],
    queryFn: async () => {
      const r = await authFetch("/api/finance/accounts-receivable");
      if (!r.ok) throw new Error("Failed to load");
      return r.json();
    },
  });

  const journalsQuery = useQuery({
    queryKey: ["/api/journal-entries"],
    queryFn: async () => {
      const r = await authFetch("/api/journal-entries");
      if (!r.ok) throw new Error("Failed to load");
      const j = await r.json();
      return Array.isArray(j) ? j : (j as { journal_entries?: unknown[] }).journal_entries ?? j;
    },
  });

  const isLoading = coaQuery.isLoading || trialBalanceQuery.isLoading || plQuery.isLoading;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-display font-bold">Finance</h2>
          <p className="text-muted-foreground">General Ledger, Trial Balance, P&L, AR</p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && (
          <Tabs defaultValue="overview">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="coa">Chart of Accounts</TabsTrigger>
              <TabsTrigger value="trial">Trial Balance</TabsTrigger>
              <TabsTrigger value="journals">Journal Entries</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">P&L (Period)</CardTitle>
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">{formatINR((plQuery.data as { profit?: number })?.profit ?? 0)}</div>
                    <p className="text-xs text-muted-foreground">Revenue − Expense</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                    <Receipt className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">{formatINR((plQuery.data as { revenue?: number })?.revenue ?? 0)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Expense</CardTitle>
                    <Banknote className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">{formatINR((plQuery.data as { expense?: number })?.expense ?? 0)}</div>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Accounts Receivable</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-2">Invoice</th>
                          <th className="text-left p-2">Date</th>
                          <th className="text-right p-2">Total</th>
                          <th className="text-right p-2">Outstanding</th>
                        </tr>
                      </thead>
                      <tbody>
                        {((arQuery.data as { invoices?: { number: string; date: string; total_amount: number; outstanding: number }[] })?.invoices ?? []).map((inv) => (
                          <tr key={inv.number} className="border-b">
                            <td className="p-2">{inv.number}</td>
                            <td className="p-2">{inv.date}</td>
                            <td className="text-right p-2">{formatINR(inv.total_amount)}</td>
                            <td className="text-right p-2">{formatINR(inv.outstanding)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="coa">
              <Card>
                <CardHeader>
                  <CardTitle>Chart of Accounts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-2">Code</th>
                          <th className="text-left p-2">Name</th>
                          <th className="text-left p-2">Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(coaQuery.data ?? []).map((a: { id: number; code: string; name: string; account_type: string }) => (
                          <tr key={a.id} className="border-b">
                            <td className="p-2">{a.code}</td>
                            <td className="p-2">{a.name}</td>
                            <td className="p-2">{a.account_type}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="trial">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Scale className="h-5 w-5" /> Trial Balance (as of {asOf})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-2">Code</th>
                          <th className="text-left p-2">Name</th>
                          <th className="text-right p-2">Debit</th>
                          <th className="text-right p-2">Credit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {((trialBalanceQuery.data as { accounts?: { code: string; name: string; debit: number; credit: number }[] })?.accounts ?? []).map((a, i) => (
                          <tr key={i} className="border-b">
                            <td className="p-2">{a.code}</td>
                            <td className="p-2">{a.name}</td>
                            <td className="text-right p-2">{formatINR(a.debit)}</td>
                            <td className="text-right p-2">{formatINR(a.credit)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="journals">
              <Card>
                <CardHeader>
                  <CardTitle>Journal Entries</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-2">Number</th>
                          <th className="text-left p-2">Date</th>
                          <th className="text-left p-2">Reference</th>
                          <th className="text-left p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(Array.isArray(journalsQuery.data) ? journalsQuery.data : []).map((j: { id: number; number?: string; date?: string; reference?: string; status?: string }) => (
                          <tr key={j.id} className="border-b">
                            <td className="p-2">{j.number ?? j.id}</td>
                            <td className="p-2">{typeof j.date === "string" ? j.date.slice(0, 10) : j.date}</td>
                            <td className="p-2">{j.reference ?? "—"}</td>
                            <td className="p-2">{j.status ?? "—"}</td>
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
