import { useState, useMemo } from "react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { authFetch } from "@/lib/authFetch";
import { Loader2, FileText, Settings2, Download, Edit, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { DataTablePagination } from "@/components/DataTablePagination";

type QuotationDefaults = {
  buyer_name: string;
  buyer_address: string;
  subject: string;
  product_details: string;
  remarks: string;
  terms_and_conditions: string;
  seller_name: string;
  seller_designation: string;
  seller_company: string;
  seller_phone: string;
};

type SavedQuotation = {
  id: number;
  buyer_name: string | null;
  subject: string | null;
  created_at: string | null;
};

type ProductRow = {
  srNo: string;
  item: string;
  rate: string;
  uom: string;
};

function parseProductRows(text: string): Array<[string, string, string, string]> {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const rows: Array<[string, string, string, string]> = [["Sr. no.", "Item", "Rate", "Uom"]];
  const dataLines = lines.length > 1 ? lines.slice(1) : [];

  for (const line of dataLines) {
    // Prefer pipe delimiter so Item names with spaces are preserved
    if (line.includes("|")) {
      const parts = line.split("|").map((part) => part.trim());
      if (parts.length >= 4) {
        rows.push([parts[0], parts[1], parts[2], parts[3]]);
        continue;
      }
    }

    // Fallback: space-separated (e.g. legacy defaults)
    const tokens = line.split(/\s+/);
    if (!tokens.length) continue;

    const srNo = tokens[0];
    const rateIdx = tokens.findIndex((token, index) => index > 0 && /^-?\d+(\.\d+)?$/.test(token));
    if (rateIdx === -1) {
      rows.push([srNo, tokens.slice(1).join(" "), "", ""]);
      continue;
    }

    rows.push([
      srNo,
      tokens.slice(1, rateIdx).join(" "),
      tokens[rateIdx],
      tokens.slice(rateIdx + 1).join(" "),
    ]);
  }

  if (rows.length === 1) rows.push(["1.", "", "", ""]);
  return rows;
}

function buildProductDetails(rows: ProductRow[], defaultText?: string) {
  const nonEmpty = rows.filter(
    (r) => r.item.trim() || r.rate.trim() || r.uom.trim()
  );
  if (nonEmpty.length === 0) {
    // Let backend fall back to defaults if nothing entered
    return defaultText ?? "";
  }
  // Use pipe delimiter so Item names with spaces (e.g. "Tile 2 Adhesive") are not split
  const header = "Sr. no.|Item|Rate|Uom";
  const lines = nonEmpty.map((r, idx) => {
    const sr = r.srNo.trim() || `${idx + 1}.`;
    return [sr, r.item.trim(), r.rate.trim(), r.uom.trim()].join("|");
  });
  return [header, ...lines].join("\n");
}

export default function Quotations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [buyerName, setBuyerName] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [subject, setSubject] = useState("");
  const [remarks, setRemarks] = useState("");
  const [terms, setTerms] = useState("");
  const [sellerName, setSellerName] = useState("");
  const [sellerDesignation, setSellerDesignation] = useState("");
  const [sellerCompany, setSellerCompany] = useState("");
  const [sellerPhone, setSellerPhone] = useState("");
  const [productRows, setProductRows] = useState<ProductRow[]>([
    { srNo: "1.", item: "", rate: "", uom: "" },
  ]);

  const [editingQuotationId, setEditingQuotationId] = useState<number | null>(null);

  const [isDefaultsOpen, setIsDefaultsOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const defaultsQuery = useQuery({
    queryKey: ["/api/quotation-letter-defaults"],
    queryFn: async () => {
      const r = await authFetch("/api/quotation-letter-defaults");
      if (!r.ok) throw new Error("Failed to load defaults");
      const j = (await r.json()) as QuotationDefaults;
      return j;
    },
  });

  const quotationsQuery = useQuery({
    queryKey: ["/api/quotation-letters"],
    queryFn: async () => {
      const r = await authFetch("/api/quotation-letters");
      if (!r.ok) throw new Error("Failed to load quotations");
      const j = await r.json();
      return (j as { quotations?: SavedQuotation[] }).quotations ?? [];
    },
  });

  const updateDefaultsMutation = useMutation({
    mutationFn: async (data: Partial<QuotationDefaults>) => {
      const r = await authFetch("/api/quotation-letter-defaults", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error((e as { detail?: string }).detail ?? "Failed to update defaults");
      }
      return (await r.json()) as QuotationDefaults;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotation-letter-defaults"] });
      toast({ title: "Saved", description: "Default quotation values updated" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const createQuotationMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        buyer_name: buyerName,
        buyer_address: buyerAddress,
        subject,
        product_details: buildProductDetails(productRows, defaultsQuery.data?.product_details),
        remarks,
        terms_and_conditions: terms,
        seller_name: sellerName,
        seller_designation: sellerDesignation,
        seller_company: sellerCompany,
        seller_phone: sellerPhone,
      };
      const r = await authFetch("/api/quotation-letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error((e as { detail?: string }).detail ?? "Failed to save quotation");
      }
      return (await r.json()) as { id: number };
    },
    onSuccess: async (res) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotation-letters"] });
      try {
        const r = await authFetch(`/api/quotation-letters/${res.id}/pdf`);
        if (!r.ok) throw new Error("Failed to download PDF");
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Quotation-${String(res.id).padStart(3, "0")}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: "Saved", description: "Quotation saved and PDF downloaded" });
      } catch (e) {
        toast({
          title: "Partial success",
          description:
            e instanceof Error ? e.message : "Quotation saved but download failed. Try again from the list below.",
        });
      }
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const updateQuotationMutation = useMutation({
    mutationFn: async () => {
      if (!editingQuotationId) throw new Error("No quotation selected for update");
      const payload = {
        buyer_name: buyerName,
        buyer_address: buyerAddress,
        subject,
        product_details: buildProductDetails(productRows, defaultsQuery.data?.product_details),
        remarks,
        terms_and_conditions: terms,
        seller_name: sellerName,
        seller_designation: sellerDesignation,
        seller_company: sellerCompany,
        seller_phone: sellerPhone,
      };
      const r = await authFetch(`/api/quotation-letters/${editingQuotationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error((e as { detail?: string }).detail ?? "Failed to update quotation");
      }
      return (await r.json()) as { id: number };
    },
    onSuccess: async (res) => {
      setEditingQuotationId(null);
      setShowPreview(false);
      queryClient.invalidateQueries({ queryKey: ["/api/quotation-letters"] });
      try {
        const r = await authFetch(`/api/quotation-letters/${res.id}/pdf`);
        if (!r.ok) throw new Error("Failed to download PDF");
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Quotation-${String(res.id).padStart(3, "0")}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: "Updated", description: "Quotation updated and PDF downloaded" });
      } catch (e) {
        toast({
          title: "Partial success",
          description:
            e instanceof Error ? e.message : "Quotation updated but download failed. Try again from the list below.",
        });
      }
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const handleEditQuotation = async (quotationId: number) => {
    try {
      const r = await authFetch(`/api/quotation-letters/${quotationId}`);
      if (!r.ok) throw new Error("Failed to load quotation");
      const q = (await r.json()) as {
        buyer_name?: string | null;
        buyer_address?: string | null;
        subject?: string | null;
        product_details?: string | null;
        remarks?: string | null;
        terms_and_conditions?: string | null;
        seller_name?: string | null;
        seller_designation?: string | null;
        seller_company?: string | null;
        seller_phone?: string | null;
      };

      setEditingQuotationId(quotationId);
      setShowPreview(false);

      setBuyerName(q.buyer_name ?? "");
      setBuyerAddress(q.buyer_address ?? "");
      setSubject(q.subject ?? "");
      setRemarks(q.remarks ?? "");
      setTerms(q.terms_and_conditions ?? "");
      setSellerName(q.seller_name ?? "");
      setSellerDesignation(q.seller_designation ?? "");
      setSellerCompany(q.seller_company ?? "");
      setSellerPhone(q.seller_phone ?? "");

      const parsed = parseProductRows(q.product_details ?? "");
      const rows = parsed.slice(1).map(([srNo, item, rate, uom]) => ({
        srNo,
        item,
        rate,
        uom,
      }));
      setProductRows(rows.length ? rows : [{ srNo: "1.", item: "", rate: "", uom: "" }]);
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to edit quotation",
        variant: "destructive",
      });
    }
  };

  const effective = useMemo(() => {
    const d = defaultsQuery.data;
    return {
      buyer_name: buyerName || d?.buyer_name || "",
      buyer_address: buyerAddress || d?.buyer_address || "",
      subject: subject || d?.subject || "",
      product_details: buildProductDetails(productRows, d?.product_details),
      remarks: remarks || d?.remarks || "",
      terms_and_conditions: terms || d?.terms_and_conditions || "",
      seller_name: sellerName || d?.seller_name || "",
      seller_designation: sellerDesignation || d?.seller_designation || "",
      seller_company: sellerCompany || d?.seller_company || "",
      seller_phone: sellerPhone || d?.seller_phone || "",
    };
  }, [
    defaultsQuery.data,
    buyerName,
    buyerAddress,
    subject,
    productRows,
    remarks,
    terms,
    sellerName,
    sellerDesignation,
    sellerCompany,
    sellerPhone,
  ]);

  const previewProductRows = useMemo(
    () => parseProductRows(effective.product_details),
    [effective.product_details]
  );

  const [showPreview, setShowPreview] = useState(false);

  const handleViewQuotation = () => {
    setShowPreview(true);
  };

  const resetQuotationForm = () => {
    setEditingQuotationId(null);
    setBuyerName("");
    setBuyerAddress("");
    setSubject("");
    setRemarks("");
    setTerms("");
    setSellerName("");
    setSellerDesignation("");
    setSellerCompany("");
    setSellerPhone("");
    setProductRows([{ srNo: "1.", item: "", rate: "", uom: "" }]);
    setShowPreview(false);
  };

  const defaults = defaultsQuery.data;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-display font-bold">Quotations</h2>
            <p className="text-muted-foreground">
              Create classic SILVERLINE quotations in the standard format.
            </p>
          </div>
          <Dialog open={isDefaultsOpen} onOpenChange={setIsDefaultsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" type="button">
                <Settings2 className="w-4 h-4 mr-2" />
                Defaults
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Quotation defaults</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                {!defaults && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                )}
                {defaults && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Buyer name</label>
                        <Input
                          defaultValue={defaults.buyer_name}
                          onBlur={(e) => (defaults.buyer_name = e.target.value)}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-1">
                        <label className="text-sm font-medium">Subject</label>
                        <Input
                          defaultValue={defaults.subject}
                          onBlur={(e) => (defaults.subject = e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Buyer address</label>
                      <Textarea
                        defaultValue={defaults.buyer_address}
                        rows={3}
                        onBlur={(e) => (defaults.buyer_address = e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Product details</label>
                      <Textarea
                        defaultValue={defaults.product_details}
                        rows={4}
                        onBlur={(e) => (defaults.product_details = e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Remarks</label>
                      <Textarea
                        defaultValue={defaults.remarks}
                        rows={3}
                        onBlur={(e) => (defaults.remarks = e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Terms and Conditions</label>
                      <Textarea
                        defaultValue={defaults.terms_and_conditions}
                        rows={4}
                        onBlur={(e) => (defaults.terms_and_conditions = e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Seller name</label>
                        <Input
                          defaultValue={defaults.seller_name}
                          onBlur={(e) => (defaults.seller_name = e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Seller designation</label>
                        <Input
                          defaultValue={defaults.seller_designation}
                          onBlur={(e) => (defaults.seller_designation = e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Seller company</label>
                        <Input
                          defaultValue={defaults.seller_company}
                          onBlur={(e) => (defaults.seller_company = e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Seller phone</label>
                        <Input
                          defaultValue={defaults.seller_phone}
                          onBlur={(e) => (defaults.seller_phone = e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  disabled={!defaults || updateDefaultsMutation.isPending}
                  onClick={() => {
                    if (!defaults) return;
                    updateDefaultsMutation.mutate(defaults);
                  }}
                >
                  {updateDefaultsMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Save defaults
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" /> Create quotation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Buyer name</label>
                  <Input
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder={defaults?.buyer_name || "Buyer name"}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Subject</label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={defaults?.subject || "Subject"}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Buyer address</label>
                <Textarea
                  value={buyerAddress}
                  onChange={(e) => setBuyerAddress(e.target.value)}
                  placeholder={defaults?.buyer_address || "Buyer address"}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Product details</label>
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/40">
                        <th className="text-left px-2 py-1 w-16">Sr. no.</th>
                        <th className="text-left px-2 py-1">Item</th>
                        <th className="text-left px-2 py-1 w-24">Rate</th>
                        <th className="text-left px-2 py-1 w-24">Uom</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productRows.map((row, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="px-2 py-1 align-top">
                            <Input
                              value={row.srNo}
                              onChange={(e) => {
                                const next = [...productRows];
                                next[idx] = { ...next[idx], srNo: e.target.value };
                                setProductRows(next);
                              }}
                              className="h-7 text-xs"
                            />
                          </td>
                          <td className="px-2 py-1 align-top">
                            <Input
                              value={row.item}
                              onChange={(e) => {
                                const next = [...productRows];
                                next[idx] = { ...next[idx], item: e.target.value };
                                setProductRows(next);
                              }}
                              className="h-7 text-xs"
                              placeholder={idx === 0 ? "xyz" : ""}
                            />
                          </td>
                          <td className="px-2 py-1 align-top">
                            <Input
                              value={row.rate}
                              onChange={(e) => {
                                const next = [...productRows];
                                next[idx] = { ...next[idx], rate: e.target.value };
                                setProductRows(next);
                              }}
                              className="h-7 text-xs"
                              placeholder={idx === 0 ? "100" : ""}
                            />
                          </td>
                          <td className="px-2 py-1 align-top">
                            <div className="flex items-center gap-1">
                              <Input
                                value={row.uom}
                                onChange={(e) => {
                                  const next = [...productRows];
                                  next[idx] = { ...next[idx], uom: e.target.value };
                                  setProductRows(next);
                                }}
                                className="h-7 text-xs"
                                placeholder={idx === 0 ? "Per Nos." : ""}
                              />
                              {productRows.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive"
                                  onClick={() =>
                                    setProductRows(productRows.filter((_, i) => i !== idx))
                                  }
                                >
                                  ×
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-1">
                  <span>Leave blank to use default product row.</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() =>
                      setProductRows((rows) => [
                        ...rows,
                        { srNo: `${rows.length + 1}.`, item: "", rate: "", uom: "" },
                      ])
                    }
                  >
                    Add row
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Remarks</label>
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder={defaults?.remarks || ""}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Terms and Conditions</label>
                <Textarea
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  placeholder={defaults?.terms_and_conditions || "1. ..."}
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Seller name</label>
                  <Input
                    value={sellerName}
                    onChange={(e) => setSellerName(e.target.value)}
                    placeholder={defaults?.seller_name || "Seller name"}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Seller designation</label>
                  <Input
                    value={sellerDesignation}
                    onChange={(e) => setSellerDesignation(e.target.value)}
                    placeholder={defaults?.seller_designation || "Designation"}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Seller company</label>
                  <Input
                    value={sellerCompany}
                    onChange={(e) => setSellerCompany(e.target.value)}
                    placeholder={defaults?.seller_company || "Company"}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Seller phone</label>
                  <Input
                    value={sellerPhone}
                    onChange={(e) => setSellerPhone(e.target.value)}
                    placeholder={defaults?.seller_phone || "Phone"}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button type="button" variant="outline" onClick={handleViewQuotation}>
                  View quotation
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (editingQuotationId) {
                      updateQuotationMutation.mutate();
                    } else {
                      createQuotationMutation.mutate();
                    }
                  }}
                  disabled={createQuotationMutation.isPending || updateQuotationMutation.isPending}
                >
                  {(editingQuotationId ? updateQuotationMutation.isPending : createQuotationMutation.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingQuotationId ? "Update & Download PDF" : "Save & Download PDF"}
                </Button>
                {editingQuotationId && (
                  <Button type="button" variant="outline" onClick={resetQuotationForm}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel edit
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-dashed border-primary/40">
            <CardHeader>
              <CardTitle>Quotation preview</CardTitle>
            </CardHeader>
            <CardContent>
              {!showPreview ? (
                <p className="text-sm text-muted-foreground">
                  Click <span className="font-semibold">View quotation</span> to preview the letter with
                  defaults applied.
                </p>
              ) : (
                <div className="text-sm border rounded-lg bg-white overflow-hidden">
                  <img
                    src="/quotation-top.png"
                    alt="Quotation header"
                    className="w-full h-auto"
                  />

                  <div className="px-6 pt-5 pb-0 space-y-0 leading-relaxed">
                    <div className="flex justify-between text-[13px]">
                      <span>{`Ref: SLTMS/ ${new Date().getFullYear()}-${String(
                        (new Date().getFullYear() + 1).toString().slice(-2)
                      )}/ 001`}</span>
                      <span>{`Dated: ${new Date().toLocaleDateString("en-GB")}`}</span>
                    </div>

                    <p className="mt-5">To,</p>
                    <p className="font-bold">{effective.buyer_name}</p>
                    {effective.buyer_address.split("\n").map((l, idx) => (
                      <p key={idx}>{l}</p>
                    ))}

                    <p className="mt-4 font-bold">{`Sub: ${effective.subject}`}</p>

                    <p className="mt-4">Dear Sir,</p>
                    <p>As per telephonic conversation, please find below rates for items discussed –</p>

                    <div className="mt-4 border border-black">
                      <table className="w-full border-collapse text-xs">
                        <thead>
                          <tr className="bg-muted/20">
                            {previewProductRows[0].map((cell, idx) => (
                              <th key={idx} className="border border-black px-2 py-1 text-left font-bold">
                                {cell}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewProductRows.slice(1).map((row, idx) => (
                            <tr key={idx}>
                              {row.map((cell, cellIdx) => (
                                <td key={cellIdx} className="border border-black px-2 py-1 align-top">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {effective.remarks && (
                      <>
                        <p className="mt-4 font-bold">Remarks –</p>
                        <div className="whitespace-pre-line">{effective.remarks}</div>
                      </>
                    )}
                    <p className="mt-4 font-bold">Terms and Conditions –</p>
                    <div className="whitespace-pre-line">
                      {effective.terms_and_conditions}
                    </div>

                    <p className="mt-4">Hoping to have positive business with you.</p>
                    <p>Thanks and Regards</p>

                    <p className="mt-4 font-bold">{effective.seller_name}</p>
                    <p className="font-bold">{effective.seller_designation}</p>
                    <p className="font-bold">{effective.seller_company}</p>
                    <p>{effective.seller_phone}</p>
                  </div>
                  <img
                    src="/quotation-bottom.png"
                    alt="Quotation footer"
                    className="w-full h-auto mt-4"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Saved quotations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {quotationsQuery.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>ID</TableHead>
                        <TableHead>Buyer</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const rows = quotationsQuery.data ?? [];
                        const total = rows.length;
                        const safePageSize = Math.max(1, pageSize);
                        const totalPages = Math.max(1, Math.ceil(total / safePageSize));
                        const safePage = Math.min(Math.max(1, page), totalPages);
                        const offset = (safePage - 1) * safePageSize;
                        const paged = rows.slice(offset, offset + safePageSize);
                        if (paged.length === 0) {
                          return (
                            <TableRow>
                              <TableCell
                                colSpan={5}
                                className="text-center py-8 text-muted-foreground"
                              >
                                No quotations saved yet.
                              </TableCell>
                            </TableRow>
                          );
                        }
                        return paged.map((q) => (
                          <TableRow key={q.id}>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {q.id}
                            </TableCell>
                            <TableCell>{q.buyer_name ?? "—"}</TableCell>
                            <TableCell>{q.subject ?? "—"}</TableCell>
                            <TableCell>
                              {q.created_at
                                ? new Date(q.created_at).toLocaleDateString("en-GB")
                                : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditQuotation(q.id)}
                                  aria-label="Edit quotation"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={async () => {
                                    try {
                                      const r = await authFetch(`/api/quotation-letters/${q.id}/pdf`);
                                      if (!r.ok) throw new Error("Failed to download PDF");
                                      const blob = await r.blob();
                                      const url = URL.createObjectURL(blob);
                                      const a = document.createElement("a");
                                      a.href = url;
                                      a.download = `Quotation-${String(q.id).padStart(3, "0")}.pdf`;
                                      a.click();
                                      URL.revokeObjectURL(url);
                                    } catch (e) {
                                      toast({
                                        title: "Error",
                                        description:
                                          e instanceof Error
                                            ? e.message
                                            : "Download failed. Please try again.",
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                  aria-label="Download quotation PDF"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ));
                      })()}
                    </TableBody>
                  </Table>
                </div>
                <DataTablePagination
                  totalCount={(quotationsQuery.data ?? []).length}
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
