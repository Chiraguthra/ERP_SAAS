import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { authFetch } from "@/lib/authFetch";
import { Loader2, Plus, Truck, Edit, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";

type LogisticsEntry = {
  id: number;
  order_id: number | null;
  product_name: string;
  product_unit: string | null;
  quantity: number | null;
  distance: number | null;
  date: string | null;
  created_by: string | null;
};

type LogisticsForm = {
  order_id: string;
  product_name: string;
  product_unit: string;
  quantity: string;
  distance: string;
  date: string;
};

export default function Logistics() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const form = useForm<LogisticsForm>({
    defaultValues: { order_id: "", product_name: "", product_unit: "", quantity: "", distance: "", date: new Date().toISOString().slice(0, 10) },
  });

  const query = useQuery({
    queryKey: ["/api/logistics"],
    queryFn: async () => {
      const r = await authFetch("/api/logistics");
      if (!r.ok) throw new Error("Failed to load");
      const j = await r.json();
      return (j as { logistics?: LogisticsEntry[] }).logistics ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: LogisticsForm) => {
      const payload: Record<string, unknown> = {
        product_name: data.product_name,
        product_unit: data.product_unit || null,
        quantity: data.quantity ? parseFloat(data.quantity) : null,
        distance: data.distance ? parseFloat(data.distance) : null,
        date: data.date,
        order_id: data.order_id ? parseInt(data.order_id) : null,
      };
      const r = await authFetch("/api/logistics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.detail ?? "Failed to create");
      }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/logistics"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Success", description: "Logistics entry added" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: LogisticsForm }) => {
      const payload: Record<string, unknown> = {
        product_name: data.product_name,
        product_unit: data.product_unit || null,
        quantity: data.quantity ? parseFloat(data.quantity) : null,
        distance: data.distance ? parseFloat(data.distance) : null,
        date: data.date,
        order_id: data.order_id ? parseInt(data.order_id) : null,
      };
      const r = await authFetch(`/api/logistics/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.detail ?? "Failed to update");
      }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/logistics"] });
      setIsDialogOpen(false);
      setEditingId(null);
      form.reset();
      toast({ title: "Success", description: "Logistics entry updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await authFetch(`/api/logistics/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/logistics"] });
      toast({ title: "Deleted", description: "Entry removed" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleEdit = (entry: LogisticsEntry) => {
    setEditingId(entry.id);
    form.reset({
      order_id: entry.order_id?.toString() ?? "",
      product_name: entry.product_name,
      product_unit: entry.product_unit ?? "",
      quantity: entry.quantity?.toString() ?? "",
      distance: entry.distance?.toString() ?? "",
      date: entry.date ?? new Date().toISOString().slice(0, 10),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this logistics entry?")) return;
    deleteMutation.mutate(id);
  };

  const onSubmit = (data: LogisticsForm) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-display font-bold">Logistics</h2>
            <p className="text-muted-foreground">Track deliveries, quantities, and distances</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setEditingId(null); form.reset(); } }}>
            <DialogTrigger asChild>
              <Button className="btn-primary">
                <Plus className="w-4 h-4 mr-2" /> Add Entry
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Entry" : "Add Logistics Entry"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Order ID (optional)</label>
                    <Input type="number" {...form.register("order_id")} placeholder="Order ID" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Product Name *</label>
                    <Input {...form.register("product_name", { required: true })} placeholder="Product name" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Unit</label>
                    <Input {...form.register("product_unit")} placeholder="e.g., pcs, kg, box" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Quantity</label>
                    <Input type="number" step="0.01" {...form.register("quantity")} placeholder="Quantity" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Distance (km)</label>
                    <Input type="number" step="0.1" {...form.register("distance")} placeholder="Distance" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date *</label>
                    <Input type="date" {...form.register("date", { required: true })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingId ? "Save Changes" : "Add Entry"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {query.isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {!query.isLoading && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5" /> Logistics Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Order ID</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Distance (km)</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(query.data ?? []).map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{entry.order_id ?? "—"}</TableCell>
                        <TableCell className="font-medium">{entry.product_name}</TableCell>
                        <TableCell>{entry.product_unit ?? "—"}</TableCell>
                        <TableCell className="text-right">{entry.quantity ?? "—"}</TableCell>
                        <TableCell className="text-right">{entry.distance ?? "—"}</TableCell>
                        <TableCell>{entry.date}</TableCell>
                        <TableCell>{entry.created_by ?? "—"}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(entry)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(entry.id)} disabled={deleteMutation.isPending}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(query.data ?? []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No entries yet</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
