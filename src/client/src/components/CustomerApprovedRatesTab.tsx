import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/lib/authFetch";
import { useCustomers } from "@/hooks/use-customers";
import { useProducts } from "@/hooks/use-products";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { formatINR } from "@/lib/currency";
import { format } from "date-fns";

type RateRow = {
  id: number;
  customerId: number;
  productId: number;
  customerName: string;
  productName: string;
  productSku: string;
  productUnit: string;
  approvedRate: number;
  gstPercent: number | null;
  validFrom: string | null;
  validTo: string | null;
  remarks: string;
  lastUpdated: string | null;
};

const NONE = "__none__";

export function CustomerApprovedRatesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { customers } = useCustomers({ page: 1, pageSize: 200 });
  const { products } = useProducts({ page: 1, pageSize: 200 });

  const [filterCustomerId, setFilterCustomerId] = useState<string>(NONE);
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<RateRow | null>(null);

  const [formCustomerId, setFormCustomerId] = useState("");
  const [formProductId, setFormProductId] = useState("");
  const [formRate, setFormRate] = useState("");
  const [formGst, setFormGst] = useState("18");
  const [formValidFrom, setFormValidFrom] = useState("");
  const [formValidTo, setFormValidTo] = useState("");
  const [formRemarks, setFormRemarks] = useState("");

  const listQuery = useQuery({
    queryKey: ["/api/customer-approved-rates", filterCustomerId],
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (filterCustomerId && filterCustomerId !== NONE) {
        sp.set("customer_id", filterCustomerId);
      }
      const r = await authFetch(`/api/customer-approved-rates?${sp.toString()}`);
      if (!r.ok) throw new Error("Failed to load rates");
      const j = (await r.json()) as { items: RateRow[] };
      return j.items ?? [];
    },
  });

  const resetForm = () => {
    setFormCustomerId("");
    setFormProductId("");
    setFormRate("");
    setFormGst("18");
    setFormValidFrom("");
    setFormValidTo("");
    setFormRemarks("");
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const r = await authFetch("/api/customer-approved-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: parseInt(formCustomerId, 10),
          productId: parseInt(formProductId, 10),
          approvedRate: parseFloat(formRate),
          gstPercent: formGst.trim() === "" ? null : parseFloat(formGst),
          validFrom: formValidFrom.trim() || null,
          validTo: formValidTo.trim() || null,
          remarks: formRemarks.trim() || null,
        }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error((e as { detail?: string }).detail ?? "Failed to save");
      }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-approved-rates"] });
      setAddOpen(false);
      resetForm();
      toast({ title: "Saved", description: "Approved rate added" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editRow) throw new Error("No row");
      const r = await authFetch(`/api/customer-approved-rates/${editRow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvedRate: parseFloat(formRate),
          gstPercent: formGst.trim() === "" ? null : parseFloat(formGst),
          validFrom: formValidFrom.trim() || null,
          validTo: formValidTo.trim() || null,
          remarks: formRemarks.trim() || null,
        }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error((e as { detail?: string }).detail ?? "Failed to update");
      }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-approved-rates"] });
      setEditRow(null);
      resetForm();
      toast({ title: "Updated", description: "Rate saved" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await authFetch(`/api/customer-approved-rates/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-approved-rates"] });
      toast({ title: "Deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openEdit = (row: RateRow) => {
    setEditRow(row);
    setFormRate(String(row.approvedRate));
    setFormGst(row.gstPercent != null ? String(row.gstPercent) : "18");
    setFormValidFrom(row.validFrom ? row.validFrom.slice(0, 10) : "");
    setFormValidTo(row.validTo ? row.validTo.slice(0, 10) : "");
    setFormRemarks(row.remarks ?? "");
  };

  const getCustomerLabel = (c: { id: number; name?: string | null; company?: string | null }) =>
    c.company?.trim() || c.name?.trim() || `Customer #${c.id}`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Customer approved rates</CardTitle>
            <p className="text-sm text-muted-foreground font-normal mt-1">
              One approved rate per customer and product. Set validity dates (optional) and use them when building
              estimates.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1 min-w-[200px]">
              <Label className="text-xs">Filter by customer</Label>
              <Select value={filterCustomerId} onValueChange={setFilterCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="All customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>All customers</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {getCustomerLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (o) resetForm(); }}>
              <Button type="button" onClick={() => { resetForm(); setAddOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add rate
              </Button>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add approved rate</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <div className="space-y-1">
                    <Label>Customer</Label>
                    <Select value={formCustomerId || NONE} onValueChange={(v) => setFormCustomerId(v === NONE ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Select customer</SelectItem>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {getCustomerLabel(c)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Product</Label>
                    <Select value={formProductId || NONE} onValueChange={(v) => setFormProductId(v === NONE ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Select product</SelectItem>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.name || p.sku || `#${p.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Approved rate</Label>
                      <Input value={formRate} onChange={(e) => setFormRate(e.target.value)} placeholder="0.00" />
                    </div>
                    <div className="space-y-1">
                      <Label>GST %</Label>
                      <Input value={formGst} onChange={(e) => setFormGst(e.target.value)} placeholder="18" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Valid from</Label>
                      <Input type="date" value={formValidFrom} onChange={(e) => setFormValidFrom(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Valid to</Label>
                      <Input type="date" value={formValidTo} onChange={(e) => setFormValidTo(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Remarks</Label>
                    <Input value={formRemarks} onChange={(e) => setFormRemarks(e.target.value)} />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    disabled={
                      createMutation.isPending ||
                      !formCustomerId ||
                      !formProductId ||
                      formRate.trim() === ""
                    }
                    onClick={() => createMutation.mutate()}
                  >
                    {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {listQuery.isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">GST%</TableHead>
                    <TableHead>Validity</TableHead>
                    <TableHead>Last updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(listQuery.data ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                        No approved rates yet. Add a customer–product rate to use in estimates.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (listQuery.data ?? []).map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium max-w-[160px] truncate" title={row.customerName}>
                          {row.customerName}
                        </TableCell>
                        <TableCell className="max-w-[180px]">
                          <div className="truncate font-medium" title={row.productName}>
                            {row.productName}
                          </div>
                          {row.productSku ? (
                            <div className="text-xs text-muted-foreground truncate">{row.productSku}</div>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatINR(row.approvedRate)}</TableCell>
                        <TableCell className="text-right">{row.gstPercent ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {row.validFrom || "…"} → {row.validTo || "…"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {row.lastUpdated
                            ? format(new Date(row.lastUpdated), "dd-MM-yyyy HH:mm")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(row)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => {
                              if (confirm("Delete this approved rate?")) deleteMutation.mutate(row.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit rate</DialogTitle>
            {editRow ? (
              <p className="text-sm text-muted-foreground">
                {editRow.customerName} · {editRow.productName}
              </p>
            ) : null}
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Approved rate</Label>
                <Input value={formRate} onChange={(e) => setFormRate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>GST %</Label>
                <Input value={formGst} onChange={(e) => setFormGst(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Valid from</Label>
                <Input type="date" value={formValidFrom} onChange={(e) => setFormValidFrom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Valid to</Label>
                <Input type="date" value={formValidTo} onChange={(e) => setFormValidTo(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Remarks</Label>
              <Input value={formRemarks} onChange={(e) => setFormRemarks(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              disabled={updateMutation.isPending || formRate.trim() === ""}
              onClick={() => updateMutation.mutate()}
            >
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
