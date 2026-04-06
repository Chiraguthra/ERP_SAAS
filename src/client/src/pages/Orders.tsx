import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { DataTablePagination } from "@/components/DataTablePagination";
import { useOrder, useOrders } from "@/hooks/use-orders";
import { useCustomers } from "@/hooks/use-customers";
import { useProducts } from "@/hooks/use-products";
import { Link, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { getStatusLabel } from "@/lib/orderStatus";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Loader2, Minus, Edit, Trash2, ChevronDown, Eye } from "lucide-react";
import { format } from "date-fns";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { formatINR } from "@/lib/currency";

export default function Orders() {
  const searchString = useSearch();
  const { toast } = useToast();
  
  // Parse URL query params (e.g. ?status=pending)
  const initialStatusFilter = (() => {
    const q = searchString?.startsWith("?") ? searchString : searchString ? `?${searchString}` : "";
    return new URLSearchParams(q).get("status")?.toLowerCase() || null;
  })();

  // FIX: Controlled state for Search (No useRef)
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter || "all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [openProductPopoverIndex, setOpenProductPopoverIndex] = useState<number | null>(null);
  const [openCustomerPopover, setOpenCustomerPopover] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [viewItemsOrderId, setViewItemsOrderId] = useState<number | null>(null);
  const [isItemsDialogOpen, setIsItemsDialogOpen] = useState(false);
  const [dispatchedSelections, setDispatchedSelections] = useState<Record<number, boolean>>({});

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [billId, setBillId] = useState<string>("");
  const [contactNumber, setContactNumber] = useState<string>("");
  const [deliveryNote, setDeliveryNote] = useState<string>("");
  const [referenceNo, setReferenceNo] = useState<string>("");
  const [buyersOrderNo, setBuyersOrderNo] = useState<string>("");
  const [dispatchDocNo, setDispatchDocNo] = useState<string>("");
  const [dispatchedThrough, setDispatchedThrough] = useState<string>("");
  const [modeTermsOfPayment, setModeTermsOfPayment] = useState<string>("");
  const [otherReferences, setOtherReferences] = useState<string>("");
  const [deliveryNoteDate, setDeliveryNoteDate] = useState<string>("");
  const [destination, setDestination] = useState<string>("");
  const [termsOfDelivery, setTermsOfDelivery] = useState<string>("");
  const [orderItems, setOrderItems] = useState<{ productId: string; quantity: number; price?: number }[]>([{ productId: "", quantity: 1 }]);

  const { orders, total, isLoading, createOrder, isCreating, deleteOrder, isDeleting } = useOrders({
    q: search,
    status: statusFilter === "all" ? null : statusFilter,
    page,
    pageSize,
  });
  const { customers } = useCustomers({ q: customerSearch, page: 1, pageSize: 200 });
  const { products } = useProducts({ page: 1, pageSize: 200 });
  const {
    order: itemsOrder,
    isLoading: isLoadingItemsOrder,
    updateDispatchItems,
    isUpdatingDispatchItems,
  } = useOrder(viewItemsOrderId ?? 0);

  useEffect(() => {
    const next: Record<number, boolean> = {};
    (itemsOrder?.items ?? []).forEach((item: any) => {
      next[item.id] = !!item.dispatched;
    });
    setDispatchedSelections(next);
  }, [itemsOrder]);

  const getCustomerDisplayName = (customer: { name?: string | null; company?: string | null; contactPerson?: string | null; emailId?: string | null }) => {
    return customer.name?.trim() || customer.company?.trim() || customer.contactPerson?.trim() || customer.emailId?.trim() || "Unnamed customer";
  };

  // FIX: Using string | number for form inputs prevents cursor jumping/resetting when typing decimals
  const [freightCharges, setFreightCharges] = useState<string | number>("");
  const [adjustments, setAdjustments] = useState<string | number>("");
  const [cgstPercent, setCgstPercent] = useState<string | number>("");
  const [sgstPercent, setSgstPercent] = useState<string | number>("");
  const [igstPercent, setIgstPercent] = useState<string | number>("");

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const handleAddItem = () => {
    setOrderItems([...orderItems, { productId: "", quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: "productId" | "quantity" | "price", value: string | number) => {
    const newItems = [...orderItems];
    if (field === "productId") {
      newItems[index].productId = String(value);
      const prod = products.find(p => p.id === parseInt(String(value)));
      newItems[index].price = prod != null ? Number(prod.price) ?? undefined : undefined;
    } else if (field === "quantity") {
      newItems[index].quantity = Number(value) || 0;
    } else {
      newItems[index].price = value === "" ? undefined : Number(value);
    }
    setOrderItems(newItems);
  };

  const subtotal = orderItems.reduce((sum, i) => {
    if (!i.productId || i.quantity <= 0) return sum;
    const rate = i.price ?? products.find(p => p.id === parseInt(i.productId))?.price ?? 0;
    return sum + Number(rate) * i.quantity;
  }, 0);

  // Helper to safely convert input string/number to calculation number
  const safeFloat = (val: string | number) => {
    const n = typeof val === "string" ? parseFloat(val) : val;
    return Number.isNaN(n) ? 0 : n;
  };

  const cgstPct = safeFloat(cgstPercent);
  const sgstPct = safeFloat(sgstPercent);
  const igstPct = safeFloat(igstPercent);
  const freight = safeFloat(freightCharges);
  const adjust = safeFloat(adjustments);

  // GST applied on (subtotal + freight) as taxable base
  const taxableBase = subtotal + freight;
  const cgstAmt = taxableBase * (cgstPct / 100);
  const sgstAmt = taxableBase * (sgstPct / 100);
  const igstAmt = taxableBase * (igstPct / 100);
  const finalAmount = taxableBase + cgstAmt + sgstAmt + igstAmt - adjust;

  const handleDeleteOrder = (orderId: number) => {
    if (!confirm("Are you sure you want to delete this order?")) return;
    deleteOrder(orderId, {
      onSuccess: () => toast({ title: "Success", description: "Order deleted" }),
      onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  const handleCreateOrder = () => {
    if (!selectedCustomerId) {
      toast({ title: "Error", description: "Select a customer", variant: "destructive" });
      return;
    }

    const validItems = orderItems.filter(i => i.productId && i.quantity > 0).map(i => {
      const prod = products.find(p => p.id === parseInt(i.productId));
      const rate = i.price ?? prod?.price ?? 0;
      return {
        productId: parseInt(i.productId),
        quantity: Number(i.quantity),
        price: Number(rate),
      };
    });

    if (validItems.length === 0) {
      toast({ title: "Error", description: "Add at least one product", variant: "destructive" });
      return;
    }

    createOrder({
      customerId: parseInt(selectedCustomerId),
      items: validItems,
      status: "pending",
      billId: billId.trim() || undefined,
      contactNumber: contactNumber.trim() || undefined,
      deliveryNote: deliveryNote.trim() || undefined,
      referenceNo: referenceNo.trim() || undefined,
      buyersOrderNo: buyersOrderNo.trim() || undefined,
      dispatchDocNo: dispatchDocNo.trim() || undefined,
      dispatchedThrough: dispatchedThrough.trim() || undefined,
      modeTermsOfPayment: modeTermsOfPayment.trim() || undefined,
      otherReferences: otherReferences.trim() || undefined,
      deliveryNoteDate: deliveryNoteDate.trim() || undefined,
      destination: destination.trim() || undefined,
      termsOfDelivery: termsOfDelivery.trim() || undefined,
      freightCharges: freight || undefined,
      adjustments: adjust || undefined,
      cgstPercent: cgstPct || undefined,
      sgstPercent: sgstPct || undefined,
      igstPercent: igstPct || undefined,
    }, {
      onSuccess: (createdOrder: { id?: number } | undefined) => {
        setIsCreateOpen(false);
        setOrderItems([{ productId: "", quantity: 1 }]);
        setSelectedCustomerId("");
        setBillId("");
        setContactNumber("");
        setDeliveryNote("");
        setReferenceNo("");
        setBuyersOrderNo("");
        setDispatchDocNo("");
        setDispatchedThrough("");
        setModeTermsOfPayment("");
        setOtherReferences("");
        setDeliveryNoteDate("");
        setDestination("");
        setTermsOfDelivery("");
        setFreightCharges("");
        setAdjustments("");
        setCgstPercent("");
        setSgstPercent("");
        setIgstPercent("");
        const orderId = createdOrder?.id;
        toast({
          title: "Success",
          description: orderId ? `Order #${orderId} created successfully` : "Order created successfully",
        });
      },
      onError: (err) => {
        toast({ title: "Failed", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-display font-bold">Orders</h2>
            <p className="text-muted-foreground">Manage and track customer orders</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="btn-primary">
                <Plus className="w-4 h-4 mr-2" /> New Order
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Order</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4 pr-1">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Bill ID</label>
                  <Input
                    value={billId}
                    onChange={(e) => setBillId(e.target.value)}
                    placeholder="e.g. BILL-001"
                    className="max-w-xs"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Customer</label>
                  <Popover
                    open={openCustomerPopover}
                    onOpenChange={(open) => {
                      setOpenCustomerPopover(open);
                      if (!open) setCustomerSearch("");
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="w-full justify-between font-normal min-w-0 overflow-hidden">
                        <span className="truncate">
                          {selectedCustomerId
                            ? getCustomerDisplayName(customers.find(c => c.id.toString() === selectedCustomerId) ?? {})
                            : "Select Customer"}
                        </span>
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder="Search customer..."
                          value={customerSearch}
                          onValueChange={setCustomerSearch}
                        />
                        <CommandList>
                          <CommandEmpty>No customer found.</CommandEmpty>
                          {customers.map(c => (
                            <CommandItem
                              key={c.id}
                              value={[
                                c.name ?? "",
                                c.company ?? "",
                                c.contactPerson ?? "",
                                c.emailId ?? "",
                                c.phone ?? "",
                              ].join(" ")}
                              onSelect={() => {
                                setSelectedCustomerId(c.id.toString());
                                setCustomerSearch("");
                                setOpenCustomerPopover(false);
                              }}
                            >
                              {getCustomerDisplayName(c)}
                            </CommandItem>
                          ))}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Contact Number</label>
                  <Input
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="Phone for this order (overrides customer default)"
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Delivery Note</label>
                    <Input value={deliveryNote} onChange={(e) => setDeliveryNote(e.target.value)} placeholder="Delivery note" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Reference No.</label>
                    <Input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="Reference number" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Buyers Order No.</label>
                    <Input value={buyersOrderNo} onChange={(e) => setBuyersOrderNo(e.target.value)} placeholder="Buyer order ref" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Dispatch Doc No.</label>
                    <Input value={dispatchDocNo} onChange={(e) => setDispatchDocNo(e.target.value)} placeholder="Dispatch document" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Dispatched Through</label>
                    <Input value={dispatchedThrough} onChange={(e) => setDispatchedThrough(e.target.value)} placeholder="e.g. Courier name" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Mode/Terms of Payment</label>
                    <Input value={modeTermsOfPayment} onChange={(e) => setModeTermsOfPayment(e.target.value)} placeholder="Payment terms" />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <label className="text-sm font-medium">Other References</label>
                    <Input value={otherReferences} onChange={(e) => setOtherReferences(e.target.value)} placeholder="Other references" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Delivery Note Date</label>
                    <Input
                      type="date"
                      value={deliveryNoteDate}
                      onChange={(e) => setDeliveryNoteDate(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Destination</label>
                    <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Delivery destination" />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <label className="text-sm font-medium">Terms of Delivery</label>
                    <Input value={termsOfDelivery} onChange={(e) => setTermsOfDelivery(e.target.value)} placeholder="Terms of delivery" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">Order Items</label>
                    <Button variant="outline" size="sm" onClick={handleAddItem}>Add Item</Button>
                  </div>
                  
                  {orderItems.map((item, index) => (
                    <div key={index} className="flex gap-2 items-end flex-wrap">
                      <div className="flex-1 min-w-[140px] space-y-2">
                        <label className="text-xs text-muted-foreground">Product</label>
                        <Popover open={openProductPopoverIndex === index} onOpenChange={(open: boolean) => setOpenProductPopoverIndex(open ? index : null)}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" className="w-full justify-between font-normal text-left min-w-0 overflow-hidden">
                              <span className="truncate">
                                {item.productId ? (products.find(p => p.id === parseInt(item.productId))?.name ?? "Select Product") : "Select Product"}
                              </span>
                              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search product..." />
                              <CommandList>
                                <CommandEmpty>No product found.</CommandEmpty>
                                {products.map(p => (
                                    <CommandItem
                                      key={p.id}
                                      value={String(p.name ?? p.sku ?? "")}
                                      onSelect={() => {
                                      handleItemChange(index, "productId", p.id.toString());
                                      setOpenProductPopoverIndex(null);
                                    }}
                                  >
                                    {p.name} {Number(p.stock ?? 0) <= 0 ? "(Out of Stock)" : ""}
                                  </CommandItem>
                                ))}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                        <div className="w-24 space-y-2">
                        <label className="text-xs text-muted-foreground">Rate (₹)</label>
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.01"
                          value={item.price !== undefined ? item.price : (item.productId ? Number(products.find(p => p.id === parseInt(item.productId))?.price) ?? "" : "")} 
                          onChange={(e) => handleItemChange(index, "price", e.target.value === "" ? "" : parseFloat(e.target.value))} 
                          placeholder="Price"
                        />
                      </div>
                      <div className="w-20 space-y-2">
                        <label className="text-xs text-muted-foreground">Qty</label>
                        <Input 
                          type="number" 
                          min="1" 
                          value={item.quantity} 
                          onChange={(e) => handleItemChange(index, "quantity", parseInt(e.target.value) || 0)} 
                        />
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleRemoveItem(index)}
                        disabled={orderItems.length === 1}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Freight charges (₹)</label>
                      {/* FIX: Controlled Input allowing decimals without immediate reset */}
                      <Input 
                        type="number" 
                        min="0" 
                        step="0.01" 
                        value={freightCharges} 
                        onChange={(e) => setFreightCharges(e.target.value)} 
                        placeholder="0" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Adjustments (₹)</label>
                       {/* FIX: Controlled Input allowing decimals without immediate reset */}
                      <Input 
                        type="number" 
                        step="0.01" 
                        value={adjustments} 
                        onChange={(e) => setAdjustments(e.target.value)} 
                        placeholder="0" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">CGST %</label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={cgstPercent}
                        onChange={(e) => setCgstPercent(e.target.value)}
                        placeholder="e.g. 9"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">SGST %</label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={sgstPercent}
                        onChange={(e) => setSgstPercent(e.target.value)}
                        placeholder="e.g. 9"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">IGST %</label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={igstPercent}
                        onChange={(e) => setIgstPercent(e.target.value)}
                        placeholder="e.g. 18"
                      />
                    </div>
                  </div>
                  <div className="text-right space-y-1 border-t pt-4">
                    <p className="text-sm text-muted-foreground">Sub total: {formatINR(subtotal)}</p>
                    {(cgstPct > 0 || sgstPct > 0 || igstPct > 0) && (
                      <p className="text-sm text-muted-foreground">
                        CGST {cgstPct}%: {formatINR(cgstAmt)} · SGST {sgstPct}%: {formatINR(sgstAmt)} · IGST {igstPct}%: {formatINR(igstAmt)}
                      </p>
                    )}
                    <p className="text-lg font-bold">Final amount: {formatINR(finalAmount)}</p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateOrder} disabled={isCreating}>
                  {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Order
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {statusFilter !== "all" && (
          <div className="flex items-center justify-between gap-4 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
            <span className="text-sm font-medium">
              Showing orders: <span className="font-semibold text-primary">{getStatusLabel(statusFilter)}</span>
            </span>
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setStatusFilter("all")}>
              <X className="w-4 h-4" /> Show all
            </Button>
          </div>
        )}

        <div className="flex items-center gap-4 bg-card p-4 rounded-xl shadow-sm border border-border/50 flex-wrap">
          <Search className="w-5 h-5 text-muted-foreground" />
          {/* FIX: Controlled Input - value={search}, no Ref, no defaultValue */}
          <Input 
            placeholder="Search orders by ID or Customer..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-none shadow-none focus-visible:ring-0 bg-transparent h-auto p-0 text-base min-w-[220px] flex-1"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="partial_dispatched">Partial Dispatched</SelectItem>
              <SelectItem value="dispatched">Dispatched</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="returned">Returned</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <Card className="shadow-lg shadow-black/5 overflow-hidden border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Bill ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status changed</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        No orders found
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map((order) => (
                      <TableRow key={order.id} className="group hover:bg-muted/30 transition-colors">
                        <TableCell className="font-medium font-mono text-xs">#{order.id}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{order.billId ?? "—"}</TableCell>
                        <TableCell>{order.customer?.name || order.customer?.company || order.customer?.contactPerson || "—"}</TableCell>
                        <TableCell>{order.createdAt ? format(new Date(order.createdAt), "MMM d, yyyy") : "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{order.updatedAt ? format(new Date(order.updatedAt), "MMM d, yyyy HH:mm") : "—"}</TableCell>
                        <TableCell className="font-semibold">{formatINR(order.totalAmount)}</TableCell>
                        <TableCell>
                          <StatusBadge status={order.status} />
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {(order.status || "").toString().toLowerCase() === "pending" ? (
                            <>
                              <Link href={`/orders/${order.id}`}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                  aria-label="Edit order"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteOrder(order.id)}
                                disabled={isDeleting}
                                aria-label="Delete order"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => {
                                  setViewItemsOrderId(order.id);
                                  setIsItemsDialogOpen(true);
                                }}
                                aria-label="View products"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Link href={`/orders/${order.id}`}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label="View order"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setViewItemsOrderId(order.id);
                                  setIsItemsDialogOpen(true);
                                }}
                                aria-label="View products"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
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

        <Dialog
          open={isItemsDialogOpen}
          onOpenChange={(open) => {
            setIsItemsDialogOpen(open);
            if (!open) {
              setViewItemsOrderId(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                Order products {viewItemsOrderId != null ? `#${viewItemsOrderId}` : ""}
              </DialogTitle>
            </DialogHeader>
            {isLoadingItemsOrder ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Dispatched</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(itemsOrder?.items ?? []).map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={!!dispatchedSelections[item.id]}
                            onChange={(e) =>
                              setDispatchedSelections((prev) => ({
                                ...prev,
                                [item.id]: e.target.checked,
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          {item.product?.name || item.product?.sku || `#${item.productId}`}
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                      </TableRow>
                    ))}
                    {(itemsOrder?.items ?? []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                          No products on this order.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
            <DialogFooter>
              <Button
                type="button"
                onClick={() => {
                  const ids = Object.entries(dispatchedSelections)
                    .filter(([, checked]) => checked)
                    .map(([id]) => Number(id));
                  updateDispatchItems(
                    { dispatchedItemIds: ids },
                    {
                      onSuccess: () => {
                        setIsItemsDialogOpen(false);
                        setViewItemsOrderId(null);
                        toast({ title: "Updated", description: "Dispatch items updated" });
                      },
                      onError: (err) => {
                        toast({
                          title: "Error",
                          description: err.message,
                          variant: "destructive",
                        });
                      },
                    }
                  );
                }}
                disabled={isUpdatingDispatchItems || isLoadingItemsOrder}
              >
                {isUpdatingDispatchItems && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save dispatch selection
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}