import { useRoute } from "wouter";
import { Layout } from "@/components/Layout";
import { useOrder } from "@/hooks/use-orders";
import { useProducts } from "@/hooks/use-products";
import { useRetailer } from "@/hooks/use-retailer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Loader2, ArrowLeft, Printer, Plus, Minus } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { formatINR } from "@/lib/currency";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ORDER_STATUSES, getStatusLabel } from "@/lib/orderStatus";
import { useState, useEffect } from "react";

type EditableItem = {
  productId: number;
  quantity: number;
  price: number;
  productName?: string;
  productSku?: string;
  productUnit?: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default function OrderDetail() {
  const [_, params] = useRoute("/orders/:id");
  const id = parseInt(params?.id || "0");
  const { order, isLoading, updateStatus, isUpdating, updateOrder, isUpdatingOrder } = useOrder(id);
  const { products } = useProducts({ page: 1, pageSize: 200 });
  const { retailer } = useRetailer();
  const { toast } = useToast();
  const [billIdInput, setBillIdInput] = useState("");
  const [contactNumberInput, setContactNumberInput] = useState("");
  const [deliveryNoteInput, setDeliveryNoteInput] = useState("");
  const [referenceNoInput, setReferenceNoInput] = useState("");
  const [buyersOrderNoInput, setBuyersOrderNoInput] = useState("");
  const [dispatchDocNoInput, setDispatchDocNoInput] = useState("");
  const [dispatchedThroughInput, setDispatchedThroughInput] = useState("");
  const [modeTermsOfPaymentInput, setModeTermsOfPaymentInput] = useState("");
  const [otherReferencesInput, setOtherReferencesInput] = useState("");
  const [deliveryNoteDateInput, setDeliveryNoteDateInput] = useState("");
  const [destinationInput, setDestinationInput] = useState("");
  const [termsOfDeliveryInput, setTermsOfDeliveryInput] = useState("");
  const [freightInput, setFreightInput] = useState("");
  const [adjustmentsInput, setAdjustmentsInput] = useState("");
  const [cgstPercentInput, setCgstPercentInput] = useState("");
  const [sgstPercentInput, setSgstPercentInput] = useState("");
  const [igstPercentInput, setIgstPercentInput] = useState("");
  const [editableItems, setEditableItems] = useState<EditableItem[]>([]);
  const [openProductPopoverIndex, setOpenProductPopoverIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!order) return;
    const o = order as Record<string, unknown>;
    setBillIdInput((order.billId as string) ?? "");
    setContactNumberInput((o.contactNumber as string) ?? "");
    setDeliveryNoteInput((o.deliveryNote as string) ?? "");
    setReferenceNoInput((o.referenceNo as string) ?? "");
    setBuyersOrderNoInput((o.buyersOrderNo as string) ?? "");
    setDispatchDocNoInput((o.dispatchDocNo as string) ?? "");
    setDispatchedThroughInput((o.dispatchedThrough as string) ?? "");
    setModeTermsOfPaymentInput((o.modeTermsOfPayment as string) ?? "");
    setOtherReferencesInput((o.otherReferences as string) ?? "");
    const dnd = o.deliveryNoteDate as string | undefined;
    setDeliveryNoteDateInput(dnd ? dnd.slice(0, 10) : "");
    setDestinationInput((o.destination as string) ?? "");
    setTermsOfDeliveryInput((o.termsOfDelivery as string) ?? "");
    const ext = order as unknown as { freightCharges?: number; adjustments?: number; cgstPercent?: number | null; sgstPercent?: number | null; igstPercent?: number | null };
    setFreightInput(ext.freightCharges != null ? String(ext.freightCharges) : "");
    setAdjustmentsInput(ext.adjustments != null ? String(ext.adjustments) : "");
    setCgstPercentInput(ext.cgstPercent != null ? String(ext.cgstPercent) : "");
    setSgstPercentInput(ext.sgstPercent != null ? String(ext.sgstPercent) : "");
    setIgstPercentInput(ext.igstPercent != null ? String(ext.igstPercent) : "");
    const items = order.items ?? [];
    setEditableItems(
      items.map((i: {
        productId?: number;
        quantity?: number;
        price?: string | number;
        product?: { name?: string; sku?: string; unit?: string };
      }) => ({
        productId: i.productId ?? 0,
        quantity: i.quantity ?? 0,
        price: Number(i.price) || 0,
        productName: i.product?.name ?? "",
        productSku: i.product?.sku ?? "",
        productUnit: i.product?.unit ?? "",
      }))
    );
  }, [order]);

  const handleSaveOrderDetails = () => {
    const isPendingOrder = (order?.status || "").toString().toLowerCase() === "pending";
    const payload: Record<string, unknown> = {
      billId: billIdInput.trim() || null,
      contactNumber: contactNumberInput.trim() || null,
      deliveryNote: deliveryNoteInput.trim() || null,
      referenceNo: referenceNoInput.trim() || null,
      buyersOrderNo: buyersOrderNoInput.trim() || null,
      dispatchDocNo: dispatchDocNoInput.trim() || null,
      dispatchedThrough: dispatchedThroughInput.trim() || null,
      modeTermsOfPayment: modeTermsOfPaymentInput.trim() || null,
      otherReferences: otherReferencesInput.trim() || null,
      deliveryNoteDate: deliveryNoteDateInput.trim() ? `${deliveryNoteDateInput}T00:00:00` : null,
      destination: destinationInput.trim() || null,
      termsOfDelivery: termsOfDeliveryInput.trim() || null,
    };
    if (isPendingOrder) {
      payload.freightCharges = parseFloat(freightInput) || 0;
      payload.adjustments = parseFloat(adjustmentsInput) || 0;
      payload.cgstPercent = cgstPercentInput !== "" ? parseFloat(cgstPercentInput) || null : null;
      payload.sgstPercent = sgstPercentInput !== "" ? parseFloat(sgstPercentInput) || null : null;
      payload.igstPercent = igstPercentInput !== "" ? parseFloat(igstPercentInput) || null : null;
      if (editableItems.length > 0) {
        const items = editableItems
          .filter((row) => row.productId && row.quantity > 0)
          .map((row) => ({ productId: row.productId, quantity: row.quantity, price: row.price }));
        if (items.length === 0) {
          toast({ title: "Error", description: "Add at least one item", variant: "destructive" });
          return;
        }
        payload.items = items;
      }
    }
    updateOrder(payload as Parameters<typeof updateOrder>[0], {
      onSuccess: () => toast({ title: "Order updated" }),
      onError: (err) => toast({ title: "Update failed", description: err.message, variant: "destructive" }),
    });
  };

  const addEditableItem = () => {
    setEditableItems((prev) => [...prev, { productId: 0, quantity: 1, price: 0 }]);
  };
  const removeEditableItem = (index: number) => {
    setEditableItems((prev) => prev.filter((_, i) => i !== index));
  };
  const setEditableItem = (index: number, field: keyof EditableItem, value: number) => {
    setEditableItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === "productId") {
        const prod = products.find((p) => p.id === value);
        if (prod) {
          next[index].price = Number(prod.price) ?? 0;
          next[index].productName = prod.name ?? "";
          next[index].productSku = prod.sku ?? "";
          next[index].productUnit = prod.unit ?? "";
        } else {
          // Keep existing snapshot if product is not in current products page.
          next[index].productName = next[index].productName ?? "";
          next[index].productSku = next[index].productSku ?? "";
          next[index].productUnit = next[index].productUnit ?? "";
        }
      }
      return next;
    });
  };

  if (isLoading) return <Layout><div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div></Layout>;
  if (!order) return <Layout><div className="p-8">Order not found</div></Layout>;

  const isPending = (order.status || "").toString().toLowerCase() === "pending";
  const orderDate = order.createdAt ? format(new Date(order.createdAt), "dd-MM-yyyy") : "—";
  const orderDateTime = order.createdAt ? format(new Date(order.createdAt), "PPp") : "—";
  const orderExt = order as unknown as { freightCharges?: number; adjustments?: number; cgstPercent?: number; sgstPercent?: number; igstPercent?: number };
  const subtotal = order.items?.reduce((sum, i) => sum + Number(i.price || 0) * (i.quantity || 0), 0) ?? 0;
  const editableSubtotal = isPending
    ? editableItems.reduce((sum, row) => sum + (row.price || 0) * (row.quantity || 0), 0)
    : subtotal;
  const freight = isPending ? parseFloat(freightInput) || 0 : (Number(orderExt.freightCharges) || 0);
  const adjustments = isPending ? parseFloat(adjustmentsInput) || 0 : (Number(orderExt.adjustments) || 0);
  const cgstPct = isPending ? parseFloat(cgstPercentInput) || 0 : (Number(orderExt.cgstPercent) || 0);
  const sgstPct = isPending ? parseFloat(sgstPercentInput) || 0 : (Number(orderExt.sgstPercent) || 0);
  const igstPct = isPending ? parseFloat(igstPercentInput) || 0 : (Number(orderExt.igstPercent) || 0);
  const taxableBase = editableSubtotal + freight;
  const cgstAmt = taxableBase * (cgstPct / 100);
  const sgstAmt = taxableBase * (sgstPct / 100);
  const igstAmt = taxableBase * (igstPct / 100);
  const sumBeforeAdj = taxableBase + cgstAmt + sgstAmt + igstAmt;
  const rawTotal = sumBeforeAdj - adjustments;
  const displayTotal = isPending
    ? (rawTotal - Math.floor(rawTotal) < 0.5 ? Math.floor(rawTotal) : Math.ceil(rawTotal))
    : Number(order.totalAmount) || 0;

  const handleStatusUpdate = (newStatus: string) => {
    updateStatus({ status: newStatus }, {
      onSuccess: () => toast({ title: "Status Updated", description: `Order marked as ${getStatusLabel(newStatus)}` }),
      onError: (err) => toast({ title: "Update Failed", description: err.message, variant: "destructive" })
    });
  };

  const customer = order.customer as Record<string, unknown> | undefined;
  const custName = (customer?.company ?? customer?.contactPerson ?? customer?.contact_person ?? customer?.name ?? "—") as string;
  const custAddress = [customer?.address, customer?.city, customer?.state, customer?.pinCode, customer?.country].filter(Boolean).join(", ");
  const custGstin = (customer?.gstin ?? "—") as string;
  const custPan = (customer?.pan ?? "—") as string;

  const retailerName = retailer?.name?.trim() || "Silverline Techno Management Services";
  const retailerAddressLines = [retailer?.address, retailer?.city, retailer?.state, retailer?.pinCode ? `PIN: ${retailer.pinCode}` : null, retailer?.country].filter(Boolean);
  const retailerAddress = retailerAddressLines.join(", ") || "—";
  const retailerGstin = retailer?.gstin?.trim() || "—";
  const retailerPan = retailer?.pan?.trim() || "—";

  const handlePrint = () => {
    const o = order as Record<string, unknown>;
    const contactNum = o.contactNumber != null && String(o.contactNumber).trim() !== "" ? String(o.contactNumber) : null;
    const refs = [
      { label: "Delivery Note", value: o.deliveryNote },
      { label: "Reference No.", value: o.referenceNo },
      { label: "Buyers Order No.", value: o.buyersOrderNo },
      { label: "Dispatch Doc No.", value: o.dispatchDocNo },
      { label: "Dispatched Through", value: o.dispatchedThrough },
      { label: "Mode/Terms of Payment", value: o.modeTermsOfPayment },
      { label: "Other References", value: o.otherReferences },
      { label: "Delivery Note Date", value: o.deliveryNoteDate ? String(o.deliveryNoteDate).slice(0, 10) : null },
      { label: "Destination", value: o.destination },
      { label: "Terms of Delivery", value: o.termsOfDelivery },
    ].filter((r) => r.value != null && String(r.value).trim() !== "");

    const referenceSectionHtml =
      refs.length > 0
        ? `<div class="ref-block">
          <div class="ref-title">Reference &amp; delivery</div>
          <div class="ref-grid">
            ${refs.map((r) => `<span class="ref-item"><span class="ref-label">${escapeHtml(r.label)}:</span> ${escapeHtml(String(r.value))}</span>`).join("")}
          </div>
        </div>`
        : "";

    const contactLineHtml = contactNum ? `<p class="muted">Contact: ${escapeHtml(contactNum)}</p>` : "";

    const itemsRowsHtml = (order.items ?? [])
      .map(
        (item: { id: number; product?: { name?: string; unit?: string }; quantity: number; price?: string | number }) =>
          `<tr>
            <td class="td">${escapeHtml(item.product?.name ?? "—")}</td>
            <td class="td tr">${escapeHtml(item.product?.unit ?? "—")}</td>
            <td class="td tr">${item.quantity}</td>
            <td class="td tr">${formatINR(item.price)}</td>
            <td class="td tr">${formatINR(Number(item.price) * item.quantity)}</td>
          </tr>`
      )
      .join("");

    const printBody = `
      <div class="print-page">
        <div class="head">
          <div>
            <h1 class="title">Order Placed</h1>
            <p class="muted">Order #${order.id}${order.billId ? ` · Bill ID: ${escapeHtml(order.billId)}` : ""}</p>
          </div>
          <div class="head-right">
            <p class="label">Date</p>
            <p>${escapeHtml(orderDateTime)}</p>
            <p class="label">Order Date</p>
            <p>${escapeHtml(orderDate)}</p>
          </div>
        </div>
        <div class="fromto">
          <div>
            <p class="label">From</p>
            <p class="strong">${escapeHtml(retailerName)}</p>
            <p class="muted">${escapeHtml(retailerAddress)}</p>
            <p class="muted">GSTIN: ${escapeHtml(retailerGstin)} PAN: ${escapeHtml(retailerPan)}</p>
          </div>
          <div>
            <p class="label">To</p>
            <p class="strong">${escapeHtml(custName)}</p>
            <p class="muted">${escapeHtml(custAddress || "—")}</p>
            ${contactLineHtml}
            <p class="muted">PIN: ${escapeHtml(String(customer?.pinCode ?? "—"))} GSTIN: ${escapeHtml(custGstin)} PAN: ${escapeHtml(custPan)}</p>
          </div>
        </div>
        ${referenceSectionHtml}
        <table class="tbl">
          <thead>
            <tr>
              <th class="th">Items</th>
              <th class="th tr">Unit</th>
              <th class="th tr">Qty</th>
              <th class="th tr">Rate</th>
              <th class="th tr">Amount</th>
            </tr>
          </thead>
          <tbody>${itemsRowsHtml}</tbody>
        </table>
        <div class="totals">
          <p><span class="muted">Sub Total</span> ${formatINR(subtotal)}</p>
          <p><span class="muted">Freight</span> ${formatINR(freight)}</p>
          ${cgstPct > 0 ? `<p><span class="muted">CGST ${cgstPct}%</span> ${formatINR(cgstAmt)}</p>` : ""}
          ${sgstPct > 0 ? `<p><span class="muted">SGST ${sgstPct}%</span> ${formatINR(sgstAmt)}</p>` : ""}
          ${igstPct > 0 ? `<p><span class="muted">IGST ${igstPct}%</span> ${formatINR(igstAmt)}</p>` : ""}
          <p><span class="muted">Adjustments</span> ${formatINR(adjustments)}</p>
          <p class="total-line">Order Total ${formatINR(Number(order.totalAmount))}</p>
        </div>
        <div class="sign">
          <p class="muted">For ${escapeHtml(retailerName)},</p>
          <p class="strong">Authorised Signatory</p>
        </div>
      </div>`;

    const printStyles = `
      @page { size: A4; margin: 10mm; }
      @media print {
        html, body { margin: 0 !important; padding: 0 !important; }
        .print-wrap { width: 210mm; min-height: 297mm; height: 297mm; overflow: hidden !important; }
        .print-page { transform-origin: top left; transform: scale(0.99); width: 101%; max-width: none; }
        .print-page { page-break-inside: avoid; }
      }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-size: 13px; line-height: 1.4; color: #111; }
      .print-page { padding: 0; font-size: 13px; line-height: 1.4; color: #111; }
      .head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
      .title { font-size: 20px; font-weight: 700; margin: 0 0 4px 0; line-height: 1.25; }
      .head-right { text-align: right; font-size: 13px; }
      .head-right .label { font-weight: 500; margin: 0; }
      .head-right p { margin: 0 0 4px 0; line-height: 1.4; }
      .fromto { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 12px; }
      .fromto .label { font-weight: 600; color: #6b7280; margin: 0 0 4px 0; font-size: 12px; }
      .fromto .strong { font-weight: 500; margin: 0 0 4px 0; line-height: 1.4; font-size: 13px; }
      .fromto .muted { color: #6b7280; margin: 0 0 2px 0; font-size: 12px; line-height: 1.4; }
      .ref-block { border: 1px solid #e5e7eb; border-radius: 4px; padding: 10px 12px; margin-bottom: 12px; }
      .ref-title { font-weight: 600; color: #6b7280; margin: 0 0 6px 0; font-size: 12px; line-height: 1.25; }
      .ref-grid { display: grid; grid-template-columns: 1fr 1fr; column-gap: 16px; row-gap: 4px; line-height: 1.4; }
      .ref-item { display: block; margin: 0; padding: 0; font-size: 12px; color: #6b7280; line-height: 1.4; }
      .ref-label { font-weight: 500; color: #374151; }
      .tbl { border-collapse: collapse; width: 100%; margin-bottom: 12px; font-size: 12px; }
      .tbl .th, .tbl .td { border: 1px solid #e5e7eb; padding: 6px 10px; line-height: 1.4; }
      .tbl .th { background: #f3f4f6; }
      .tbl .tr { text-align: right; }
      .totals { text-align: right; margin-bottom: 12px; font-size: 13px; }
      .totals p { margin: 0 0 4px 0; line-height: 1.4; }
      .total-line { font-weight: 700; font-size: 14px; padding-top: 6px; margin-top: 6px; border-top: 1px solid #e5e7eb; }
      .sign { padding-top: 12px; border-top: 1px solid #e5e7eb; }
      .sign .muted { color: #6b7280; margin: 0; font-size: 12px; }
      .sign .strong { font-weight: 500; margin: 6px 0 0 0; font-size: 13px; }
      .muted { color: #6b7280; }
      .strong { font-weight: 500; }
      .label { font-weight: 600; }
    `;

    const win = window.open("", "_blank");
    if (!win) {
      window.print();
      return;
    }
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Order #${order.id}</title>
          <style>${printStyles}</style>
        </head>
        <body style="margin:0;padding:0;background:#fff;color:#111;">
          <div class="print-wrap">${printBody}</div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.afterprint = () => win.close();
      win.onfocus = () => setTimeout(() => win.close(), 300);
    }, 250);
  };

  return (
    <Layout>
      {/* Print-only invoice (sample layout); full page when printing */}
      <div id="order-invoice-print" className="hidden print:block print:fixed print:inset-0 print:z-50 print:overflow-auto print:bg-white print:p-8 p-8 text-sm">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-lg font-bold">Order Placed</h1>
            <p className="text-muted-foreground">Order #{order.id} {order.billId ? ` · Bill ID: ${order.billId}` : ""}</p>
          </div>
          <div className="text-right">
            <p className="font-medium">Date</p>
            <p>{orderDateTime}</p>
            <p className="mt-1 font-medium">Order Date</p>
            <p>{orderDate}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <p className="font-semibold text-muted-foreground mb-1">From</p>
            <p className="font-medium">{retailerName}</p>
            <p className="text-muted-foreground whitespace-pre-line">{retailerAddress}</p>
            <p className="text-muted-foreground">GSTIN: {retailerGstin}</p>
            <p className="text-muted-foreground">PAN: {retailerPan}</p>
          </div>
          <div>
            <p className="font-semibold text-muted-foreground mb-1">To</p>
            <p className="font-medium">{custName}</p>
            <p className="text-muted-foreground whitespace-pre-line">{custAddress || "—"}</p>
            {(order as Record<string, unknown>).contactNumber && (
              <p className="text-muted-foreground">Contact: {String((order as Record<string, unknown>).contactNumber)}</p>
            )}
            <p className="text-muted-foreground">PIN: {String(customer?.pinCode ?? "—")}</p>
            <p className="text-muted-foreground">GSTIN: {custGstin}</p>
            <p className="text-muted-foreground">PAN: {custPan}</p>
          </div>
        </div>
        {(() => {
          const o = order as Record<string, unknown>;
          const refs = [
            { label: "Delivery Note", value: o.deliveryNote },
            { label: "Reference No.", value: o.referenceNo },
            { label: "Buyers Order No.", value: o.buyersOrderNo },
            { label: "Dispatch Doc No.", value: o.dispatchDocNo },
            { label: "Dispatched Through", value: o.dispatchedThrough },
            { label: "Mode/Terms of Payment", value: o.modeTermsOfPayment },
            { label: "Other References", value: o.otherReferences },
            { label: "Delivery Note Date", value: o.deliveryNoteDate ? String(o.deliveryNoteDate).slice(0, 10) : null },
            { label: "Destination", value: o.destination },
            { label: "Terms of Delivery", value: o.termsOfDelivery },
          ].filter((r) => r.value != null && String(r.value).trim() !== "");
          if (refs.length === 0) return null;
          return (
            <div className="mb-6 border border-border rounded p-3 text-sm">
              <p className="font-semibold text-muted-foreground mb-2">Reference & delivery</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {refs.map((r) => (
                  <p key={r.label} className="text-muted-foreground">
                    <span className="font-medium">{r.label}:</span> {String(r.value)}
                  </p>
                ))}
              </div>
            </div>
          );
        })()}
        <table className="w-full border-collapse border border-border text-left mb-6">
          <thead>
            <tr className="bg-muted/50">
              <th className="border border-border px-3 py-2">Items</th>
              <th className="border border-border px-3 py-2 text-right">Unit</th>
              <th className="border border-border px-3 py-2 text-right">Quantity</th>
              <th className="border border-border px-3 py-2 text-right">Rate</th>
              <th className="border border-border px-3 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map((item) => (
              <tr key={item.id}>
                <td className="border border-border px-3 py-2">{item.product?.name ?? "—"}</td>
                <td className="border border-border px-3 py-2 text-right">{item.product?.unit ?? "—"}</td>
                <td className="border border-border px-3 py-2 text-right">{item.quantity}</td>
                <td className="border border-border px-3 py-2 text-right">{formatINR(item.price)}</td>
                <td className="border border-border px-3 py-2 text-right">{formatINR(Number(item.price) * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-end mb-6">
          <div className="text-right space-y-1 min-w-[200px]">
            <p><span className="text-muted-foreground">Sub Total</span> {formatINR(subtotal)}</p>
            <p><span className="text-muted-foreground">Freight / Transportation</span> {formatINR(freight)}</p>
            {cgstPct > 0 && <p><span className="text-muted-foreground">CGST {cgstPct}%</span> {formatINR(cgstAmt)}</p>}
            {sgstPct > 0 && <p><span className="text-muted-foreground">SGST {sgstPct}%</span> {formatINR(sgstAmt)}</p>}
            {igstPct > 0 && <p><span className="text-muted-foreground">IGST {igstPct}%</span> {formatINR(igstAmt)}</p>}
            <p><span className="text-muted-foreground">Discounts / Adjustments</span> {formatINR(adjustments)}</p>
            <p className="font-bold text-base pt-2 border-t mt-2">Order Total {formatINR(Number(order.totalAmount))}</p>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t">
          <p className="text-muted-foreground">For {retailerName},</p>
          <p className="font-medium mt-6">Authorised Signatory</p>
        </div>
      </div>

      <div className="space-y-8 print:hidden">
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <Link href="/orders">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-display font-bold">Order #{order.id}</h2>
              <StatusBadge status={order.status} className="text-sm px-3 py-1" />
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3 print:hidden">
            <p className="text-muted-foreground text-sm font-medium">{orderDateTime}</p>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" /> Print
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-lg shadow-black/5 border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Order Items</CardTitle>
                  {isPending && (
                    <Button variant="outline" size="sm" onClick={addEditableItem}>
                      <Plus className="w-4 h-4 mr-2" /> Add line
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-x-auto overflow-y-hidden">
                  <table className="w-full text-sm text-left table-fixed" style={{ minWidth: 580 }}>
                    <colgroup>
                      <col style={{ width: "30%" }} />
                      <col style={{ width: "10%" }} />
                      <col style={{ width: "13%" }} />
                      <col style={{ width: "15%" }} />
                      <col style={{ width: "18%" }} />
                      {isPending && <col style={{ width: "40px" }} />}
                    </colgroup>
                    <thead className="bg-muted/50 text-muted-foreground uppercase font-medium text-xs">
                      <tr>
                        <th className="px-4 py-3 text-left">Items</th>
                        <th className="px-3 py-3 text-right whitespace-nowrap">Unit</th>
                        <th className="px-3 py-3 text-right whitespace-nowrap">Quantity</th>
                        <th className="px-3 py-3 text-right whitespace-nowrap">Rate</th>
                        <th className="pl-6 pr-4 py-3 text-right whitespace-nowrap">Amount</th>
                        {isPending && <th className="px-4 py-3 w-10" />}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {isPending ? (
                        editableItems.map((row, index) => (
                          <tr key={index} className="bg-card">
                            <td className="px-4 py-2 align-middle overflow-hidden">
                              <Popover open={openProductPopoverIndex === index} onOpenChange={(open) => setOpenProductPopoverIndex(open ? index : null)}>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" className="w-full justify-start font-normal text-left h-9 min-w-0 overflow-hidden">
                                    <span className="truncate block min-w-0">
                                      {row.productId
                                        ? products.find((p) => p.id === row.productId)?.name
                                          ?? row.productName
                                          ?? `Product #${row.productId}`
                                        : "Select product"}
                                    </span>
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                  <Command>
                                    <CommandInput placeholder="Search product..." />
                                    <CommandList>
                                      <CommandEmpty>No product found.</CommandEmpty>
                                      {products.map((p) => (
                                        <CommandItem
                                          key={p.id}
                                          value={String(p.name ?? p.sku ?? "")}
                                          onSelect={() => {
                                            setEditableItem(index, "productId", p.id);
                                            setOpenProductPopoverIndex(null);
                                          }}
                                        >
                                          {p.name} {p.stock <= 0 ? "(Out of stock)" : ""}
                                        </CommandItem>
                                      ))}
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </td>
                            <td className="px-3 py-2 text-right whitespace-nowrap">
                              {row.productId
                                ? products.find((p) => p.id === row.productId)?.unit ?? row.productUnit ?? "—"
                                : "—"}
                            </td>
                            <td className="px-3 py-2 text-right whitespace-nowrap">
                              <Input
                                type="number"
                                min={1}
                                className="w-20 h-9 text-right"
                                value={row.quantity}
                                onChange={(e) => setEditableItem(index, "quantity", parseInt(e.target.value, 10) || 0)}
                              />
                            </td>
                            <td className="px-3 py-2 text-right whitespace-nowrap">
                              <Input
                                type="number"
                                min={0}
                                step={0.01}
                                className="w-24 h-9 text-right"
                                value={row.price || ""}
                                onChange={(e) => setEditableItem(index, "price", parseFloat(e.target.value) || 0)}
                              />
                            </td>
                            <td className="pl-6 pr-4 py-2 text-right font-semibold whitespace-nowrap">{formatINR((row.price || 0) * (row.quantity || 0))}</td>
                            {isPending && (
                              <td className="px-2 py-2">
                                <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10" onClick={() => removeEditableItem(index)}>
                                  <Minus className="w-4 h-4" />
                                </Button>
                              </td>
                            )}
                          </tr>
                        ))
                      ) : (
                        order.items?.map((item) => (
                          <tr key={item.id} className="bg-card">
                            <td className="px-4 py-3 align-middle overflow-hidden">
                              <p className="font-medium text-foreground truncate" title={item.product?.name ?? "—"}>{item.product?.name ?? "—"}</p>
                              <p className="text-xs text-muted-foreground truncate">{item.product?.sku ?? ""}</p>
                            </td>
                            <td className="px-3 py-3 text-right whitespace-nowrap">{item.product?.unit ?? "—"}</td>
                            <td className="px-3 py-3 text-right whitespace-nowrap">{item.quantity}</td>
                            <td className="px-3 py-3 text-right whitespace-nowrap">{formatINR(item.price)}</td>
                            <td className="pl-6 pr-4 py-3 text-right font-semibold whitespace-nowrap">
                              {formatINR(Number(item.price) * item.quantity)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {isPending && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-3">Charges &amp; tax</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Freight (₹)</label>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={freightInput}
                          onChange={(e) => setFreightInput(e.target.value)}
                          disabled={isUpdatingOrder}
                          placeholder="0"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Adjustments (₹)</label>
                        <Input
                          type="number"
                          step={0.01}
                          value={adjustmentsInput}
                          onChange={(e) => setAdjustmentsInput(e.target.value)}
                          disabled={isUpdatingOrder}
                          placeholder="0"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">CGST (%)</label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          value={cgstPercentInput}
                          onChange={(e) => setCgstPercentInput(e.target.value)}
                          disabled={isUpdatingOrder}
                          placeholder="0"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">SGST (%)</label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          value={sgstPercentInput}
                          onChange={(e) => setSgstPercentInput(e.target.value)}
                          disabled={isUpdatingOrder}
                          placeholder="0"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">IGST (%)</label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          value={igstPercentInput}
                          onChange={(e) => setIgstPercentInput(e.target.value)}
                          disabled={isUpdatingOrder}
                          placeholder="0"
                          className="h-9"
                        />
                      </div>
                    </div>
                  </div>
                )}
                <div className="mt-6 flex justify-end">
                  <div className="text-right space-y-1 min-w-[220px]">
                    <p className="text-sm"><span className="text-muted-foreground">Sub Total</span> {formatINR(editableSubtotal)}</p>
                    <p className="text-sm"><span className="text-muted-foreground">Freight / Transportation</span> {formatINR(freight)}</p>
                    {cgstPct > 0 && <p className="text-sm"><span className="text-muted-foreground">CGST {cgstPct}%</span> {formatINR(cgstAmt)}</p>}
                    {sgstPct > 0 && <p className="text-sm"><span className="text-muted-foreground">SGST {sgstPct}%</span> {formatINR(sgstAmt)}</p>}
                    {igstPct > 0 && <p className="text-sm"><span className="text-muted-foreground">IGST {igstPct}%</span> {formatINR(igstAmt)}</p>}
                    <p className="text-sm"><span className="text-muted-foreground">Adjustments</span> {formatINR(adjustments)}</p>
                    <p className="text-lg font-bold pt-2 border-t"><span className="text-muted-foreground font-normal">Order Total</span> {formatINR(displayTotal)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg shadow-black/5 border-border/50">
              <CardHeader>
                <CardTitle>Customer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Name</label>
                  <p className="font-medium">{order.customer?.name ?? "—"}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Email</label>
                  <p className="font-medium">{String((order.customer as Record<string, unknown>)?.email ?? order.customer?.emailId ?? "N/A")}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Phone (customer default)</label>
                  <p className="font-medium">{order.customer?.phone ?? "—"}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Shipping Address</label>
                  <p className="font-medium leading-relaxed">{order.customer?.address ?? "No address provided"}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6 overflow-y-auto lg:max-h-[calc(100vh-7rem)] lg:pr-1">
            <Card className="shadow-lg shadow-black/5 border-border/50">
              <CardHeader>
                <CardTitle>Order details</CardTitle>
                <p className="text-xs text-muted-foreground font-normal">
                  Reference &amp; delivery fields can be edited for any order status. Items and charges are editable only when order is pending.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Bill ID</label>
                    <Input
                      value={billIdInput}
                      onChange={(e) => setBillIdInput(e.target.value)}
                      placeholder="e.g. BILL-001"
                      disabled={isUpdatingOrder}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Contact Number</label>
                    <Input
                      value={contactNumberInput}
                      onChange={(e) => setContactNumberInput(e.target.value)}
                      placeholder="Phone for this order"
                      disabled={isUpdatingOrder}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Delivery Note</label>
                    <Input value={deliveryNoteInput} onChange={(e) => setDeliveryNoteInput(e.target.value)} disabled={isUpdatingOrder} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Reference No.</label>
                    <Input value={referenceNoInput} onChange={(e) => setReferenceNoInput(e.target.value)} disabled={isUpdatingOrder} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Buyers Order No.</label>
                    <Input value={buyersOrderNoInput} onChange={(e) => setBuyersOrderNoInput(e.target.value)} disabled={isUpdatingOrder} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Dispatch Doc No.</label>
                    <Input value={dispatchDocNoInput} onChange={(e) => setDispatchDocNoInput(e.target.value)} disabled={isUpdatingOrder} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Dispatched Through</label>
                    <Input value={dispatchedThroughInput} onChange={(e) => setDispatchedThroughInput(e.target.value)} disabled={isUpdatingOrder} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Mode/Terms of Payment</label>
                    <Input value={modeTermsOfPaymentInput} onChange={(e) => setModeTermsOfPaymentInput(e.target.value)} disabled={isUpdatingOrder} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Other References</label>
                  <Input value={otherReferencesInput} onChange={(e) => setOtherReferencesInput(e.target.value)} disabled={isUpdatingOrder} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Delivery Note Date</label>
                    <Input
                      type="date"
                      value={deliveryNoteDateInput}
                      onChange={(e) => setDeliveryNoteDateInput(e.target.value)}
                      disabled={isUpdatingOrder}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Destination</label>
                    <Input value={destinationInput} onChange={(e) => setDestinationInput(e.target.value)} disabled={isUpdatingOrder} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Terms of Delivery</label>
                  <Input value={termsOfDeliveryInput} onChange={(e) => setTermsOfDeliveryInput(e.target.value)} disabled={isUpdatingOrder} />
                </div>
                <Button onClick={handleSaveOrderDetails} disabled={isUpdatingOrder} className="w-full">
                  {isUpdatingOrder && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Save order details
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-lg shadow-black/5 border-border/50">
              <CardHeader>
                <CardTitle>Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Update Status</label>
                    <Select 
                      value={(order.status || "pending").toLowerCase()} 
                      onValueChange={handleStatusUpdate}
                      disabled={isUpdating}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {ORDER_STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value} className={s.value === "return" ? "text-destructive" : ""}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
