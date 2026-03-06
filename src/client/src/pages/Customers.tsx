import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { DataTablePagination } from "@/components/DataTablePagination";
import { useCustomers } from "@/hooks/use-customers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Loader2, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Fully permissive: allow create with only name (or any subset). 
const customerFormSchema = z.object({
  name: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pinCode: z.union([z.string(), z.number()]).optional(),
  country: z.string().optional(),
  website: z.string().optional(),
  phone: z.string().optional(),
  emailId: z.string().optional(),
  contactPerson: z.string().optional(),
  isLead: z.string().optional(),
  leadStatus: z.string().optional(),
  leadSource: z.string().optional(),
  assignedTo: z.string().optional(),
  gstin: z.string().optional(),
  status: z.string().optional(),
  username: z.string().optional(),
  leadCloseCode: z.union([z.string(), z.number()]).optional(),
  createdBy: z.string().optional(),
  location: z.string().optional(),
  leadId: z.string().optional(),
  pan: z.string().optional(),
});
type CustomerFormValues = z.infer<typeof customerFormSchema>;

const defaultFormValues: CustomerFormValues = {
  name: "",
  company: "",
  address: "",
  city: "",
  state: "",
  pinCode: undefined,
  country: "",
  website: "",
  phone: "",
  emailId: "",
  contactPerson: "",
  isLead: "",
  leadStatus: "",
  leadSource: "",
  assignedTo: "",
  gstin: "",
  status: "",
  username: "",
  leadCloseCode: undefined,
  createdBy: "",
  location: "",
  leadId: "",
  pan: "",
};

export default function Customers() {
  const { toast } = useToast();
  
  // FIX: Removed useRef, relying solely on controlled state
  const [search, setSearch] = useState("");
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { customers, total, isLoading, createCustomer, updateCustomer, deleteCustomer, isCreating, isUpdating, isDeleting } = useCustomers({
    q: search,
    page,
    pageSize,
  });

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: defaultFormValues,
  });

  useEffect(() => {
    setPage(1);
  }, [search]);

  const onSubmit = (data: CustomerFormValues) => {
    const payload: Record<string, unknown> = {};
    const setIf = (key: string, v: unknown, asStr = true) => {
      if (v === undefined || v === null) return;
      if (asStr && typeof v === "string" && v.trim() === "") return;
      if (key === "pinCode" || key === "leadCloseCode") {
        const n = typeof v === "number" ? v : parseFloat(String(v));
        if (!Number.isNaN(n)) payload[key] = n;
      } else {
        payload[key] = typeof v === "string" ? v.trim() : v;
      }
    };
    // ... mapping fields ...
    setIf("name", data.name);
    setIf("company", data.company);
    setIf("address", data.address);
    setIf("city", data.city);
    setIf("state", data.state);
    setIf("pinCode", data.pinCode);
    setIf("country", data.country);
    setIf("website", data.website);
    setIf("phone", data.phone);
    setIf("emailId", data.emailId);
    setIf("contactPerson", data.contactPerson);
    setIf("isLead", data.isLead);
    setIf("leadStatus", data.leadStatus);
    setIf("leadSource", data.leadSource);
    setIf("assignedTo", data.assignedTo);
    setIf("gstin", data.gstin);
    setIf("status", data.status);
    setIf("username", data.username);
    setIf("leadCloseCode", data.leadCloseCode);
    setIf("createdBy", data.createdBy);
    setIf("location", data.location);
    setIf("leadId", data.leadId);
    setIf("pan", data.pan);

    if (editingId) {
      updateCustomer({ id: editingId, ...payload }, {
        onSuccess: () => {
          setIsDialogOpen(false);
          setEditingId(null);
          form.reset(defaultFormValues);
          toast({ title: "Success", description: "Customer updated" });
        },
        onError: (err) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        },
      });
    } else {
      createCustomer(payload, {
        onSuccess: () => {
          setIsDialogOpen(false);
          form.reset(defaultFormValues);
          toast({ title: "Success", description: "Customer added" });
        },
        onError: (err) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        },
      });
    }
  };

  const handleEdit = (customer: Record<string, unknown>) => {
    setEditingId(customer.id as number);
    form.reset({
      name: (customer.name as string) ?? "",
      company: (customer.company as string) ?? "",
      address: (customer.address as string) ?? "",
      city: (customer.city as string) ?? "",
      state: (customer.state as string) ?? "",
      pinCode: (customer.pinCode as number) ?? undefined,
      country: (customer.country as string) ?? "",
      website: (customer.website as string) ?? "",
      phone: (customer.phone as string) ?? "",
      emailId: (customer.emailId ?? customer.email) as string ?? "",
      contactPerson: (customer.contactPerson ?? customer.contact_person) as string ?? "",
      isLead: (customer.isLead as string) ?? "",
      leadStatus: (customer.leadStatus as string) ?? "",
      leadSource: (customer.leadSource as string) ?? "",
      assignedTo: (customer.assignedTo as string) ?? "",
      gstin: (customer.gstin as string) ?? "",
      status: (customer.status as string) ?? "",
      username: (customer.username as string) ?? "",
      leadCloseCode: (customer.leadCloseCode as number) ?? undefined,
      createdBy: (customer.createdBy as string) ?? "",
      location: (customer.location as string) ?? "",
      leadId: (customer.leadId as string) ?? "",
      pan: (customer.pan as string) ?? "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (!confirm("Are you sure you want to delete this customer?")) return;
    deleteCustomer(id, {
      onSuccess: () => toast({ title: "Success", description: "Customer deleted" }),
      onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  const displayName = (c: Record<string, unknown>) =>
    (c?.company as string) || (c?.contactPerson as string) || (c?.contact_person as string) || (c?.name as string) || "—";
  const displayEmail = (c: Record<string, unknown>) => (c?.emailId as string) || (c?.email as string) || "—";
  const displayPhone = (c: Record<string, unknown>) => (c?.phone as string) || "—";

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-display font-bold">Customers</h2>
            <p className="text-muted-foreground">Maintain customer database</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingId(null);
              form.reset(defaultFormValues);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="btn-primary">
                <Plus className="w-4 h-4 mr-2" /> Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Customer" : "Add New Customer"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground">Basic</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Name</label>
                      <Input {...form.register("name")} placeholder="Customer name (optional)" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Company</label>
                      <Input {...form.register("company")} placeholder="Company name" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Contact Person</label>
                      <Input {...form.register("contactPerson")} placeholder="Contact name" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Email</label>
                      <Input type="email" {...form.register("emailId")} placeholder="email@example.com" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Phone</label>
                      <Input {...form.register("phone")} placeholder="Phone" />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <label className="text-sm font-medium">Website</label>
                      <Input {...form.register("website")} placeholder="https://..." />
                    </div>
                  </div>
                </div>
                {/* ... Address, Lead, Tax sections remain unchanged ... */}
                 <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground">Address</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                      <label className="text-sm font-medium">Address</label>
                      <Input {...form.register("address")} placeholder="Street address" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">City</label>
                      <Input {...form.register("city")} placeholder="City" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">State</label>
                      <Input {...form.register("state")} placeholder="State" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Pin Code</label>
                      <Input type="number" {...form.register("pinCode")} placeholder="Pin code" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Country</label>
                      <Input {...form.register("country")} placeholder="Country" />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <label className="text-sm font-medium">Location</label>
                      <Input {...form.register("location")} placeholder="Location" />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground">Lead</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Is Lead</label>
                      <Input {...form.register("isLead")} placeholder="Yes/No" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Lead Status</label>
                      <Input {...form.register("leadStatus")} placeholder="Status" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Lead Source</label>
                      <Input {...form.register("leadSource")} placeholder="Source" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Assigned To</label>
                      <Input {...form.register("assignedTo")} placeholder="User" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Lead ID</label>
                      <Input {...form.register("leadId")} placeholder="Lead ID" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Lead Close Code</label>
                      <Input type="number" {...form.register("leadCloseCode")} placeholder="Code" />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground">Tax & Other</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">GSTIN</label>
                      <Input {...form.register("gstin")} placeholder="GSTIN" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">PAN</label>
                      <Input {...form.register("pan")} placeholder="PAN" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Status</label>
                      <Input {...form.register("status")} placeholder="Status" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Username</label>
                      <Input {...form.register("username")} placeholder="Username" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Created By</label>
                      <Input {...form.register("createdBy")} placeholder="Created by" />
                    </div>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button type="submit" disabled={isCreating || isUpdating}>
                    {(isCreating || isUpdating) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingId ? "Save Changes" : "Add Customer"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-4 bg-card p-4 rounded-xl shadow-sm border border-border/50">
          <Search className="w-5 h-5 text-muted-foreground" />
          {/* FIX: Controlled Input - uses value={search} instead of defaultValue */}
          <Input
            placeholder="Search by company, contact, email, city, state..."
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            className="border-none shadow-none focus-visible:ring-0 bg-transparent h-auto p-0 text-base"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Card className="shadow-lg shadow-black/5 overflow-hidden border-border/50">
            <CardContent className="p-0 overflow-x-auto">
              <Table className="table-fixed w-full min-w-[700px]">
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[14%] min-w-0">Customer name</TableHead>
                    <TableHead className="w-[14%] min-w-0">Company name</TableHead>
                    <TableHead className="w-[12%] min-w-0">Phone</TableHead>
                    <TableHead className="w-[14%] min-w-0">Email</TableHead>
                    <TableHead className="w-[12%] min-w-0">City</TableHead>
                    <TableHead className="w-[10%] min-w-0">Status</TableHead>
                    <TableHead className="w-[22%] text-right shrink-0">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id} className="group hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium min-w-0 overflow-hidden text-ellipsis whitespace-nowrap align-top" title={String(displayName(customer))}>{displayName(customer)}</TableCell>
                      <TableCell className="text-muted-foreground min-w-0 overflow-hidden text-ellipsis whitespace-nowrap align-top" title={String(customer.company ?? "")}>{customer.company ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground min-w-0 overflow-hidden text-ellipsis whitespace-nowrap align-top" title={String(displayPhone(customer))}>{displayPhone(customer)}</TableCell>
                      <TableCell className="text-muted-foreground min-w-0 overflow-hidden text-ellipsis whitespace-nowrap align-top" title={String(displayEmail(customer))}>{displayEmail(customer)}</TableCell>
                      <TableCell className="text-muted-foreground min-w-0 overflow-hidden text-ellipsis whitespace-nowrap align-top">{customer.city ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground min-w-0 overflow-hidden text-ellipsis whitespace-nowrap align-top">{customer.status ?? "—"}</TableCell>
                      <TableCell className="text-right space-x-2 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(customer)} title="Edit">
                          <Edit className="w-4 h-4 text-muted-foreground hover:text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(customer.id)} title="Delete" disabled={isDeleting}>
                          <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {customers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        No customers found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <DataTablePagination
                totalCount={total}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}