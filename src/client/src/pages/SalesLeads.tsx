import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { authFetch } from "@/lib/authFetch";
import { Loader2, Plus, UserPlus, Edit, Download, Search } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { useAuth } from "@/hooks/use-auth";

type SalesLeadEntry = {
  id: number;
  customer: string | null;
  company: string | null;
  designation: string | null;
  status: string | null;
  phone: string | null;
  city: string | null;
  assigned: string | null;
};

type SalesLeadForm = {
  customer: string;
  company: string;
  designation: string;
  status: string;
  phone: string;
  city: string;
  assigned: string;
};

export default function SalesLeads() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filterCity, setFilterCity] = useState<string>("");
  const [filterCompany, setFilterCompany] = useState<string>("");
  const isAdmin = (user?.role ?? "").toLowerCase() === "admin";

  const form = useForm<SalesLeadForm>({
    defaultValues: {
      customer: "",
      company: "",
      designation: "",
      status: "",
      phone: "",
      city: "",
      assigned: "",
    },
  });

  const leadsQuery = useQuery({
    queryKey: ["/api/sales-leads", filterCity, filterCompany],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterCity) params.set("city", filterCity);
      if (filterCompany) params.set("company", filterCompany);
      const r = await authFetch(`/api/sales-leads?${params}`);
      if (!r.ok) throw new Error("Failed to load leads");
      const j = await r.json();
      return (j as { sales_leads?: SalesLeadEntry[] }).sales_leads ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: SalesLeadForm) => {
      const payload = {
        customer: data.customer || null,
        company: data.company || null,
        designation: data.designation || null,
        status: data.status || null,
        phone: data.phone || null,
        city: data.city || null,
        assigned: data.assigned || null,
      };
      const r = await authFetch("/api/sales-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error((e as { detail?: string }).detail ?? "Failed to create");
      }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-leads/cities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-leads/companies"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Success", description: "Lead added" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: SalesLeadForm }) => {
      const payload = {
        customer: data.customer || null,
        company: data.company || null,
        designation: data.designation || null,
        status: data.status || null,
        phone: data.phone || null,
        city: data.city || null,
        assigned: data.assigned || null,
      };
      const r = await authFetch(`/api/sales-leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error((e as { detail?: string }).detail ?? "Failed to update");
      }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-leads/cities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-leads/companies"] });
      setIsDialogOpen(false);
      setEditingId(null);
      form.reset();
      toast({ title: "Success", description: "Lead updated" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const onSubmit = (data: SalesLeadForm) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (row: SalesLeadEntry) => {
    setEditingId(row.id);
    form.reset({
      customer: row.customer ?? "",
      company: row.company ?? "",
      designation: row.designation ?? "",
      status: row.status ?? "",
      phone: row.phone ?? "",
      city: row.city ?? "",
      assigned: row.assigned ?? "",
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = (open: boolean) => {
    if (!open) {
      setEditingId(null);
      form.reset();
    }
    setIsDialogOpen(open);
  };

  const handleDownloadCsv = async () => {
    try {
      const params = new URLSearchParams();
      if (filterCity) params.set("city", filterCity);
      if (filterCompany) params.set("company", filterCompany);
      params.set("limit", "10000");
      const r = await authFetch(`/api/sales-leads?${params}`);
      if (!r.ok) throw new Error("Failed to fetch");
      const j = await r.json();
      const rows = (j as { sales_leads?: SalesLeadEntry[] }).sales_leads ?? [];
      const headers = ["Id", "Customer", "Company", "Designation", "Status", "Phone", "City", "Assigned"];
      const escape = (v: string | number | null | undefined) => {
        const s = String(v ?? "");
        if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
        return s;
      };
      const lines = [headers.join(","), ...rows.map((row) => [row.id, row.customer, row.company, row.designation, row.status, row.phone, row.city, row.assigned].map(escape).join(","))];
      const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sales-leads-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Downloaded", description: "CSV file downloaded" });
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Download failed", variant: "destructive" });
    }
  };

  const leads = leadsQuery.data ?? [];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-display font-bold">Customer / Sales Lead</h2>
            <p className="text-muted-foreground">Manage sales leads and customer contacts</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
            <DialogTrigger asChild>
              <Button className="btn-primary" type="button" onClick={() => { setEditingId(null); form.reset(); setIsDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" /> Add Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Lead" : "New Lead"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Customer</Label>
                    <Input {...form.register("customer")} placeholder="Customer name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Company</Label>
                    <Input {...form.register("company")} placeholder="Company" />
                  </div>
                  <div className="space-y-2">
                    <Label>Designation</Label>
                    <Input {...form.register("designation")} placeholder="Designation" />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Input {...form.register("status")} placeholder="e.g. New, Contacted" />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input {...form.register("phone")} placeholder="Phone" />
                  </div>
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input {...form.register("city")} placeholder="City" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Assigned</Label>
                    <Input {...form.register("assigned")} placeholder="Assigned to" />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingId ? "Save Changes" : "Add Lead"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          {isAdmin && (
            <Button variant="outline" onClick={handleDownloadCsv}>
              <Download className="w-4 h-4 mr-2" /> Download CSV
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" /> Sales Leads
            </CardTitle>
            <div className="flex flex-wrap gap-4 pt-2">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm text-muted-foreground whitespace-nowrap sr-only">Search by city</Label>
                <Input
                  placeholder="Search by city"
                  value={filterCity}
                  onChange={(e) => setFilterCity(e.target.value)}
                  className="w-[180px]"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground whitespace-nowrap sr-only">Search by company</Label>
                <Input
                  placeholder="Search by company"
                  value={filterCompany}
                  onChange={(e) => setFilterCompany(e.target.value)}
                  className="w-[180px]"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {leadsQuery.isLoading && (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            {!leadsQuery.isLoading && (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Id</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Designation</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Assigned</TableHead>
                      <TableHead className="text-right w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-mono text-muted-foreground">{row.id}</TableCell>
                        <TableCell>{row.customer ?? "—"}</TableCell>
                        <TableCell>{row.company ?? "—"}</TableCell>
                        <TableCell>{row.designation ?? "—"}</TableCell>
                        <TableCell>{row.status ?? "—"}</TableCell>
                        <TableCell>{row.phone ?? "—"}</TableCell>
                        <TableCell>{row.city ?? "—"}</TableCell>
                        <TableCell>{row.assigned ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(row)} aria-label="Edit">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {leads.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          No leads yet. Add a lead to get started.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
