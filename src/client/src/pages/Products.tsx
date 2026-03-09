import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { DataTablePagination } from "@/components/DataTablePagination";
import { useProducts } from "@/hooks/use-products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Loader2, AlertCircle, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Permissive schema so add product works with only name (or any subset)
const productFormSchema = z.object({
  name: z.string().optional(),
  price: z.union([z.string(), z.number()]).optional(),
  stock: z.union([z.string(), z.number()]).optional(),
  description: z.string().optional(),
  unit: z.string().optional(),
});
type ProductFormValues = z.infer<typeof productFormSchema>;

export default function Products() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { products, total, isLoading, createProduct, updateProduct, deleteProduct } = useProducts({
    q: search,
    page,
    pageSize,
  });

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: { name: "", price: "0", stock: 0, description: "", unit: "" }
  });

  useEffect(() => {
    setPage(1);
  }, [search]);

  const onSubmit = (data: ProductFormValues) => {
    // Build payload for API; all fields optional; coerce numbers
    const payload: Record<string, unknown> = {};
    if (data.name != null && String(data.name).trim() !== "") payload.name = String(data.name).trim();
    if (data.description != null && String(data.description).trim() !== "") payload.description = String(data.description).trim();
    if (data.unit != null && String(data.unit).trim() !== "") payload.unit = String(data.unit).trim();
    if (data.price != null && data.price !== "") {
      const n = typeof data.price === "number" ? data.price : parseFloat(String(data.price));
      payload.price = Number.isNaN(n) ? 0 : n;
    }
    if (data.stock != null && data.stock !== "") {
      const n = typeof data.stock === "number" ? data.stock : parseFloat(String(data.stock));
      payload.stock = Number.isNaN(n) ? 0 : n;
    }
    if (editingId) {
      updateProduct({ id: editingId, ...payload }, {
        onSuccess: () => {
          setIsDialogOpen(false);
          setEditingId(null);
          form.reset();
          toast({ title: "Success", description: "Product updated" });
        },
        onError: (err) => {
          toast({ title: "Failed to update product", description: err.message, variant: "destructive" });
        },
      });
    } else {
      createProduct(payload, {
        onSuccess: () => {
          setIsDialogOpen(false);
          form.reset();
          toast({ title: "Success", description: "Product created" });
        },
        onError: (err) => {
          toast({ title: "Failed to add product", description: err.message, variant: "destructive" });
        },
      });
    }
  };

  const handleEdit = (product: any) => {
    setEditingId(product.id);
    form.reset({
      name: product.name,
      price: product.price,
      stock: product.stock,
      description: product.description || "",
      unit: product.unit ?? ""
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this product?")) {
      deleteProduct(id);
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingId(null);
      form.reset({ name: "", price: "0", stock: 0, description: "", unit: "" });
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-display font-bold">Inventory</h2>
            <p className="text-muted-foreground">Manage your product catalog and stock levels</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button className="btn-primary">
                <Plus className="w-4 h-4 mr-2" /> Add Product
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Product" : "Add New Product"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input {...form.register("name")} placeholder="Product Name" />
                  {form.formState.errors.name && <span className="text-xs text-destructive">{form.formState.errors.name.message}</span>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Price</label>
                    <Input type="number" step="0.01" {...form.register("price")} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Quantity</label>
                    <Input type="number" step="any" {...form.register("stock", { valueAsNumber: true })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Unit</label>
                    <Input {...form.register("unit")} placeholder="e.g. pcs, kg, box" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input {...form.register("description")} placeholder="Short description" />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Product
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-4 bg-card p-4 rounded-xl shadow-sm border border-border/50">
          <Search className="w-5 h-5 text-muted-foreground" />
          <Input 
            placeholder="Search products by name or Item No...." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-none shadow-none focus-visible:ring-0 bg-transparent h-auto p-0 text-base"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <Card className="shadow-lg shadow-black/5 overflow-hidden border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Item No.</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id} className="group hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono text-xs text-muted-foreground">{product.sku}</TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {product.stock}
                          {product.stock < 10 && (
                            <AlertCircle className="w-4 h-4 text-destructive" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{product.unit ?? "—"}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(product)}>
                          <Edit className="w-4 h-4 text-muted-foreground hover:text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)}>
                          <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {products.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        No products found
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
