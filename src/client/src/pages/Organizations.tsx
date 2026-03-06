import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authFetch } from "@/lib/authFetch";
import { Loader2, Building2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function Organizations() {
  const orgsQuery = useQuery({
    queryKey: ["/api/organizations"],
    queryFn: async () => {
      const r = await authFetch("/api/organizations");
      if (!r.ok) throw new Error("Failed to load");
      const j = await r.json();
      return Array.isArray(j) ? j : (j as { organizations?: unknown[] }).organizations ?? j;
    },
  });

  const branchesQuery = useQuery({
    queryKey: ["/api/branches"],
    queryFn: async () => {
      const r = await authFetch("/api/branches");
      if (!r.ok) throw new Error("Failed to load");
      const j = await r.json();
      return Array.isArray(j) ? j : (j as { branches?: unknown[] }).branches ?? j;
    },
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-display font-bold">Organizations & Branches</h2>
          <p className="text-muted-foreground">Tenant and branch management</p>
        </div>
        {orgsQuery.isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {!orgsQuery.isLoading && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Organizations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2">ID</th>
                        <th className="text-left p-2">Name</th>
                        <th className="text-left p-2">Slug</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(Array.isArray(orgsQuery.data) ? orgsQuery.data : []).map((o: { id: number; name: string; slug: string }) => (
                        <tr key={o.id} className="border-b">
                          <td className="p-2">{o.id}</td>
                          <td className="p-2">{o.name}</td>
                          <td className="p-2">{o.slug}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Branches</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2">ID</th>
                        <th className="text-left p-2">Organization ID</th>
                        <th className="text-left p-2">Name</th>
                        <th className="text-left p-2">Code</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(Array.isArray(branchesQuery.data) ? branchesQuery.data : []).map((b: { id: number; organization_id: number; name: string; code?: string }) => (
                        <tr key={b.id} className="border-b">
                          <td className="p-2">{b.id}</td>
                          <td className="p-2">{b.organization_id}</td>
                          <td className="p-2">{b.name}</td>
                          <td className="p-2">{b.code ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
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
