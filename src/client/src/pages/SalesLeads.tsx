import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { DataTablePagination } from "@/components/DataTablePagination";
import { Label } from "@/components/ui/label";
import { authFetch } from "@/lib/authFetch";
import { Loader2, Plus, UserPlus, Edit, Download, Search, Trash2, ChevronDown, MessageSquare } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calculator, ListOrdered } from "lucide-react";
import { formatINR } from "@/lib/currency";
import { useLocation } from "wouter";
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
  remarks?: string | null;
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

type ProductPriceListItem = {
  id: number;
  product_name: string;
  first_price: number;
  final_price: number;
};

export default function SalesLeads() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filterCity, setFilterCity] = useState<string>("");
  const [filterCompany, setFilterCompany] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isRemarksOpen, setIsRemarksOpen] = useState(false);
  const [remarksLeadId, setRemarksLeadId] = useState<number | null>(null);
  const [remarksValue, setRemarksValue] = useState("");
  const isAdmin = (user?.role ?? "").toLowerCase() === "admin";

  const [isEnquiryOpen, setIsEnquiryOpen] = useState(false);
  const [isPriceListOpen, setIsPriceListOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [productPopoverOpen, setProductPopoverOpen] = useState(false);
  const [enquiryResult, setEnquiryResult] = useState<{
    productName: string;
    firstPrice: number;
    finalPrice: number;
  } | null>(null);

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

  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, Math.min(200, pageSize));
  const offset = (safePage - 1) * safePageSize;

  const leadsQuery = useQuery({
    queryKey: ["/api/sales-leads", filterCity, filterCompany, safePage, safePageSize],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterCity) params.set("city", filterCity);
      if (filterCompany) params.set("company", filterCompany);
       params.set("limit", String(safePageSize));
       params.set("offset", String(offset));
      const r = await authFetch(`/api/sales-leads?${params}`);
      if (!r.ok) throw new Error("Failed to load leads");
      const j = await r.json();
      const data = j as { sales_leads?: SalesLeadEntry[]; total?: number };
      return {
        items: data.sales_leads ?? [],
        total: data.total ?? 0,
      };
    },
  });

  const productPricesQuery = useQuery({
    queryKey: ["/api/product-price-list"],
    queryFn: async () => {
      const r = await authFetch("/api/product-price-list");
      if (!r.ok) {
        throw new Error("Failed to load product price list");
      }
      return (await r.json()) as ProductPriceListItem[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await authFetch(`/api/sales-leads/${id}`, {
        method: "DELETE",
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error((e as { detail?: string }).detail ?? "Failed to delete");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-leads"] });
      toast({ title: "Deleted", description: "Lead deleted" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const remarksMutation = useMutation({
    mutationFn: async ({ id, remarks }: { id: number; remarks: string }) => {
      const r = await authFetch(`/api/sales-leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remarks }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error((e as { detail?: string }).detail ?? "Failed to save remarks");
      }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-leads"] });
      setIsRemarksOpen(false);
      setRemarksLeadId(null);
      setRemarksValue("");
      toast({ title: "Saved", description: "Remarks updated" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
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
      queryClient.invalidateQueries({ queryKey: ["/api/sales-leads"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/sales-leads"] });
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

  const resetEnquiryState = () => {
    setSelectedProductId(null);
    setProductSearch("");
    setProductPopoverOpen(false);
    setEnquiryResult(null);
  };

  const handleShowPrice = () => {
    const products = productPricesQuery.data ?? [];
    const selected = products.find((p) => p.id === selectedProductId);
    if (!selected) {
      toast({ title: "Select product", description: "Please select a product first.", variant: "destructive" });
      return;
    }

    setEnquiryResult({
      productName: selected.product_name,
      firstPrice: Number(selected.first_price ?? 0),
      finalPrice: Number(selected.final_price ?? 0),
    });
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

  const leads = leadsQuery.data?.items ?? [];
  const total = leadsQuery.data?.total ?? 0;

  const handleDelete = (id: number) => {
    if (!confirm("Are you sure you want to delete this lead?")) return;
    deleteMutation.mutate(id);
  };

  const openRemarksDialog = (row: SalesLeadEntry) => {
    setRemarksLeadId(row.id);
    setRemarksValue(row.remarks ?? "");
    setIsRemarksOpen(true);
  };

  useEffect(() => {
    setPage(1);
  }, [filterCity, filterCompany]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-display font-bold">CRM</h2>
            <p className="text-muted-foreground">Manage sales leads and customer contacts</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
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

            <Dialog open={isEnquiryOpen} onOpenChange={(open) => { if (!open) { setIsEnquiryOpen(false); resetEnquiryState(); } else { setIsEnquiryOpen(true); } }}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" onClick={() => setIsEnquiryOpen(true)}>
                  <Calculator className="w-4 h-4 mr-2" /> Enquire Price
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Enquire Price</DialogTitle>
                  <DialogDescription>
                    Select a product to view its first and final price.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Product</Label>
                    <Popover open={productPopoverOpen} onOpenChange={setProductPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between font-normal"
                          disabled={productPricesQuery.isLoading || !!productPricesQuery.error}
                        >
                          <span className="truncate">
                            {selectedProductId
                              ? productPricesQuery.data?.find((p) => p.id === selectedProductId)?.product_name ?? "Select product"
                              : "Select product"}
                          </span>
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command>
                          <CommandInput
                            placeholder="Search product..."
                            value={productSearch}
                            onValueChange={setProductSearch}
                          />
                          <CommandList>
                            <CommandEmpty>No product found.</CommandEmpty>
                            {(productPricesQuery.data ?? []).map((p) => (
                              <CommandItem
                                key={p.id}
                                value={p.product_name}
                                onSelect={() => {
                                  setSelectedProductId(p.id);
                                  setProductSearch("");
                                  setProductPopoverOpen(false);
                                }}
                              >
                                {p.product_name}
                              </CommandItem>
                            ))}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Button type="button" className="w-full" onClick={handleShowPrice}>
                    <Calculator className="w-4 h-4 mr-2" /> Show Price
                  </Button>
                  {enquiryResult && (
                    <div className="rounded-lg border bg-muted/30 p-4 space-y-3 text-sm">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-muted/40">
                            <th className="border px-2 py-1 text-left">Product</th>
                            <th className="border px-2 py-1 text-right">First Price</th>
                            <th className="border px-2 py-1 text-right">Final Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border px-2 py-1">{enquiryResult.productName}</td>
                            <td className="border px-2 py-1 text-right">{formatINR(enquiryResult.firstPrice)}</td>
                            <td className="border px-2 py-1 text-right">{formatINR(enquiryResult.finalPrice)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setIsEnquiryOpen(false);
                      resetEnquiryState();
                      navigate("/rate-enquiry");
                    }}
                  >
                    Freight charges
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {isAdmin && (
              <Dialog open={isPriceListOpen} onOpenChange={setIsPriceListOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline">
                    <ListOrdered className="w-4 h-4 mr-2" /> Product Price List
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Product Price List</DialogTitle>
                    <DialogDescription>
                      Admins can view and edit first and final prices used for price enquiry.
                    </DialogDescription>
                  </DialogHeader>
                  <ProductPriceListEditor />
                </DialogContent>
              </Dialog>
            )}

            {isAdmin && (
              <Button variant="outline" onClick={handleDownloadCsv}>
                <Download className="w-4 h-4 mr-2" /> Download CSV
              </Button>
            )}
          </div>
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
            <Dialog open={isRemarksOpen} onOpenChange={setIsRemarksOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Lead Remarks</DialogTitle>
                  <DialogDescription>Add or update remarks for this CRM record.</DialogDescription>
                </DialogHeader>
                <div className="space-y-2 py-2">
                  <Label htmlFor="lead-remarks">Remarks</Label>
                  <Textarea
                    id="lead-remarks"
                    value={remarksValue}
                    onChange={(e) => setRemarksValue(e.target.value)}
                    rows={5}
                    placeholder="Enter remarks"
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    onClick={() => {
                      if (!remarksLeadId) return;
                      remarksMutation.mutate({ id: remarksLeadId, remarks: remarksValue.trim() });
                    }}
                    disabled={remarksMutation.isPending || !remarksLeadId}
                  >
                    {remarksMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save remarks
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            {leadsQuery.isLoading && (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            {!leadsQuery.isLoading && (
              <>
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
                        <TableCell className="text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openRemarksDialog(row)}
                            aria-label="Remarks"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(row)} aria-label="Edit">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(row.id)}
                            aria-label="Delete"
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
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
                <DataTablePagination
                  totalCount={total}
                  page={page}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

function ProductPriceListEditor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery<ProductPriceListItem[]>({
    queryKey: ["/api/product-price-list"],
    queryFn: async () => {
      const r = await authFetch("/api/product-price-list");
      if (!r.ok) {
        throw new Error("Failed to load product price list");
      }
      return (await r.json()) as ProductPriceListItem[];
    },
  });

  const [rows, setRows] = useState<ProductPriceListItem[]>([]);

  useEffect(() => {
    setRows(data ?? []);
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: async (item: ProductPriceListItem) => {
      const r = await authFetch(`/api/product-price-list/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_name: item.product_name,
          first_price: item.first_price,
          final_price: item.final_price,
        }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error((e as { detail?: string }).detail ?? "Failed to update");
      }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/product-price-list"] });
      toast({ title: "Saved", description: "Product price updated" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: async (item: Omit<ProductPriceListItem, "id">) => {
      const r = await authFetch("/api/product-price-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error((e as { detail?: string }).detail ?? "Failed to create");
      }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/product-price-list"] });
      toast({ title: "Added", description: "New product price added" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleRowChange = (id: number, field: keyof ProductPriceListItem, value: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]:
                field === "first_price" || field === "final_price"
                  ? Number(value || 0)
                  : value,
            }
          : row
      )
    );
  };

  const handleSaveRow = (row: ProductPriceListItem) => {
    updateMutation.mutate(row);
  };

  const [newRow, setNewRow] = useState<Omit<ProductPriceListItem, "id">>({
    product_name: "",
    first_price: 0,
    final_price: 0,
  });

  const handleAddRow = () => {
    if (!newRow.product_name.trim()) {
      toast({ title: "Product name required", description: "Enter product name before adding.", variant: "destructive" });
      return;
    }
    createMutation.mutate(newRow);
    setNewRow({ product_name: "", first_price: 0, final_price: 0 });
  };

  if (isLoading) {
    return (
      <div className="py-4 text-sm text-muted-foreground">
        Loading product price list...
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4 text-sm text-destructive">
        Failed to load product price list.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-10">Id</TableHead>
              <TableHead>Product</TableHead>
              <TableHead className="w-32">First Price</TableHead>
              <TableHead className="w-32">Final Price</TableHead>
              <TableHead className="w-28 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-mono text-muted-foreground">{row.id}</TableCell>
                <TableCell>
                  <Input
                    value={row.product_name}
                    onChange={(e) => handleRowChange(row.id, "product_name", e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={row.first_price}
                    onChange={(e) => handleRowChange(row.id, "first_price", e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={row.final_price}
                    onChange={(e) => handleRowChange(row.id, "final_price", e.target.value)}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSaveRow(row)}
                    disabled={updateMutation.isPending}
                  >
                    Save
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                  No products yet. Add a row below.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="border-t pt-4 space-y-2">
        <p className="text-sm font-medium">Add new product</p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Input
            className="sm:col-span-2"
            placeholder="Product name"
            value={newRow.product_name}
            onChange={(e) => setNewRow((prev) => ({ ...prev, product_name: e.target.value }))}
          />
          <Input
            type="number"
            placeholder="First price"
            value={newRow.first_price}
            onChange={(e) => setNewRow((prev) => ({ ...prev, first_price: Number(e.target.value || 0) }))}
          />
          <Input
            type="number"
            placeholder="Final price"
            value={newRow.final_price}
            onChange={(e) => setNewRow((prev) => ({ ...prev, final_price: Number(e.target.value || 0) }))}
          />
        </div>
        <div className="flex justify-end pt-2">
          <Button
            size="sm"
            onClick={handleAddRow}
            disabled={createMutation.isPending}
          >
            Add Product
          </Button>
        </div>
      </div>
    </div>
  );
}
