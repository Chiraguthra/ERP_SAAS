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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type QuotationDefaults = {
  buyer_name: string;
  buyer_address: string;
  subject: string;
  product_details: string;
  remarks: string;
  terms_and_conditions: string;
  bank_details: string;
  seller_name: string;
  seller_designation: string;
  seller_company: string;
  seller_phone: string;
};

type EstimateDefaults = {
  buyer_name: string;
  buyer_address: string;
  buyer_gstin: string;
  buyer_phone: string;
  place_of_supply: string;
  subject: string;
  product_details: string;
  remarks: string;
  terms_and_conditions: string;
  bank_details: string;
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

type SavedProforma = {
  id: number;
  buyer_name: string | null;
  subject: string | null;
  created_at: string | null;
};

type PiProductRow = {
  srNo: string;
  item: string;
  qty: string;
  uom: string;
  unitPrice: string;
  gstPct: string;
};

const PI_PIPE_HEADER = "Sr|Item|Qty|Uom|UnitPrice|GST%";

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

function parsePiProductRows(text: string): Array<[string, string, string, string, string, string]> {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const rows: Array<[string, string, string, string, string, string]> = [
    ["Sr", "Item", "Qty", "Uom", "UnitPrice", "GST%"],
  ];

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const parts = line.split("|").map((p) => p.trim());
    if (parts.length >= 7) {
      if (idx === 0 && parts[1].toLowerCase() === "item") continue;
      rows.push([parts[0], parts[1], parts[3], parts[4], parts[5], parts[6]]);
      continue;
    }
    if (parts.length >= 6) {
      if (idx === 0 && parts[1].toLowerCase() === "item") continue;
      rows.push([parts[0], parts[1], parts[2], parts[3], parts[4], parts[5]]);
      continue;
    }
    if (parts.length >= 4) {
      if (idx === 0 && parts[1].toLowerCase() === "item") continue;
      rows.push([parts[0], parts[1], "1", parts[3], parts[2], "18"]);
    }
  }

  if (rows.length === 1) rows.push(["1.", "", "1", "", "", "18"]);
  return rows;
}

function buildPiProductDetails(rows: PiProductRow[], defaultText?: string) {
  const nonEmpty = rows.filter(
    (r) =>
      r.item.trim() ||
      r.qty.trim() ||
      r.uom.trim() ||
      r.unitPrice.trim() ||
      r.gstPct.trim()
  );
  if (nonEmpty.length === 0) {
    return defaultText ?? "";
  }
  const lines = nonEmpty.map((r, idx) => {
    const sr = r.srNo.trim() || `${idx + 1}.`;
    return [sr, r.item.trim(), r.qty.trim() || "1", r.uom.trim(), r.unitPrice.trim(), r.gstPct.trim() || "18"].join("|");
  });
  return [PI_PIPE_HEADER, ...lines].join("\n");
}

export default function Quotations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [buyerName, setBuyerName] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [subject, setSubject] = useState("");
  const [remarks, setRemarks] = useState("");
  const [terms, setTerms] = useState("");
  const [bankDetails, setBankDetails] = useState("");
  const [sellerName, setSellerName] = useState("");
  const [sellerDesignation, setSellerDesignation] = useState("");
  const [sellerCompany, setSellerCompany] = useState("");
  const [sellerPhone, setSellerPhone] = useState("");
  const [productRows, setProductRows] = useState<ProductRow[]>([
    { srNo: "1.", item: "", rate: "", uom: "" },
  ]);

  const [editingQuotationId, setEditingQuotationId] = useState<number | null>(null);

  const [piBuyerName, setPiBuyerName] = useState("");
  const [piBuyerAddress, setPiBuyerAddress] = useState("");
  const [piBuyerGstin, setPiBuyerGstin] = useState("");
  const [piBuyerPhone, setPiBuyerPhone] = useState("");
  const [piPlaceOfSupply, setPiPlaceOfSupply] = useState("");
  const [piSubject, setPiSubject] = useState("");
  const [piRemarks, setPiRemarks] = useState("");
  const [piTerms, setPiTerms] = useState("");
  const [piBankDetails, setPiBankDetails] = useState("");
  const [piSellerName, setPiSellerName] = useState("");
  const [piSellerDesignation, setPiSellerDesignation] = useState("");
  const [piSellerCompany, setPiSellerCompany] = useState("");
  const [piSellerPhone, setPiSellerPhone] = useState("");
  const [piProductRows, setPiProductRows] = useState<PiProductRow[]>([
    { srNo: "1.", item: "", qty: "1", uom: "", unitPrice: "", gstPct: "18" },
  ]);
  const [editingProformaId, setEditingProformaId] = useState<number | null>(null);
  const [showPiPreview, setShowPiPreview] = useState(false);
  const [piPage, setPiPage] = useState(1);
  const [piPageSize, setPiPageSize] = useState(10);

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

  const estimateDefaultsQuery = useQuery({
    queryKey: ["/api/estimate-defaults"],
    queryFn: async () => {
      const r = await authFetch("/api/estimate-defaults");
      if (!r.ok) throw new Error("Failed to load estimate defaults");
      return (await r.json()) as EstimateDefaults;
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

  const updateEstimateDefaultsMutation = useMutation({
    mutationFn: async (data: Partial<EstimateDefaults>) => {
      const r = await authFetch("/api/estimate-defaults", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error((e as { detail?: string }).detail ?? "Failed to update estimate defaults");
      }
      return (await r.json()) as EstimateDefaults;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimate-defaults"] });
      toast({ title: "Saved", description: "Estimate defaults updated" });
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
        bank_details: bankDetails,
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
        bank_details: bankDetails,
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

  const proformaInvoicesQuery = useQuery({
    queryKey: ["/api/proforma-invoices"],
    queryFn: async () => {
      const r = await authFetch("/api/proforma-invoices");
      if (!r.ok) throw new Error("Failed to load estimates");
      const j = await r.json();
      return (j as { proforma_invoices?: SavedProforma[] }).proforma_invoices ?? [];
    },
  });

  const createProformaMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        buyer_name: piBuyerName,
        buyer_address: piBuyerAddress,
        buyer_gstin: piBuyerGstin,
        buyer_phone: piBuyerPhone,
        place_of_supply: piPlaceOfSupply,
        subject: piSubject,
        product_details: buildPiProductDetails(piProductRows, estimateDefaultsQuery.data?.product_details),
        remarks: piRemarks,
        terms_and_conditions: piTerms,
        bank_details: piBankDetails,
        seller_name: piSellerName,
        seller_designation: piSellerDesignation,
        seller_company: piSellerCompany,
        seller_phone: piSellerPhone,
      };
      const r = await authFetch("/api/proforma-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error((e as { detail?: string }).detail ?? "Failed to save estimate");
      }
      return (await r.json()) as { id: number };
    },
    onSuccess: async (res) => {
      queryClient.invalidateQueries({ queryKey: ["/api/proforma-invoices"] });
      try {
        const r = await authFetch(`/api/proforma-invoices/${res.id}/pdf`);
        if (!r.ok) throw new Error("Failed to download PDF");
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Estimate-${String(res.id).padStart(3, "0")}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: "Saved", description: "Estimate saved and PDF downloaded" });
      } catch (e) {
        toast({
          title: "Partial success",
          description:
            e instanceof Error ? e.message : "Estimate saved but download failed. Try again from the list below.",
        });
      }
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const updateProformaMutation = useMutation({
    mutationFn: async () => {
      if (!editingProformaId) throw new Error("No estimate selected for update");
      const payload = {
        buyer_name: piBuyerName,
        buyer_address: piBuyerAddress,
        buyer_gstin: piBuyerGstin,
        buyer_phone: piBuyerPhone,
        place_of_supply: piPlaceOfSupply,
        subject: piSubject,
        product_details: buildPiProductDetails(piProductRows, estimateDefaultsQuery.data?.product_details),
        remarks: piRemarks,
        terms_and_conditions: piTerms,
        bank_details: piBankDetails,
        seller_name: piSellerName,
        seller_designation: piSellerDesignation,
        seller_company: piSellerCompany,
        seller_phone: piSellerPhone,
      };
      const r = await authFetch(`/api/proforma-invoices/${editingProformaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error((e as { detail?: string }).detail ?? "Failed to update estimate");
      }
      return (await r.json()) as { id: number };
    },
    onSuccess: async (res) => {
      setEditingProformaId(null);
      setShowPiPreview(false);
      queryClient.invalidateQueries({ queryKey: ["/api/proforma-invoices"] });
      try {
        const r = await authFetch(`/api/proforma-invoices/${res.id}/pdf`);
        if (!r.ok) throw new Error("Failed to download PDF");
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Estimate-${String(res.id).padStart(3, "0")}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: "Updated", description: "Estimate updated and PDF downloaded" });
      } catch (e) {
        toast({
          title: "Partial success",
          description:
            e instanceof Error ? e.message : "Estimate updated but download failed. Try again from the list below.",
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
        bank_details?: string | null;
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
      setBankDetails(q.bank_details ?? "");
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

  const handleEditProforma = async (proformaId: number) => {
    try {
      const r = await authFetch(`/api/proforma-invoices/${proformaId}`);
      if (!r.ok) throw new Error("Failed to load estimate");
      const p = (await r.json()) as {
        buyer_name?: string | null;
        buyer_address?: string | null;
        buyer_gstin?: string | null;
        buyer_phone?: string | null;
        place_of_supply?: string | null;
        subject?: string | null;
        product_details?: string | null;
        remarks?: string | null;
        terms_and_conditions?: string | null;
        bank_details?: string | null;
        seller_name?: string | null;
        seller_designation?: string | null;
        seller_company?: string | null;
        seller_phone?: string | null;
      };

      setEditingProformaId(proformaId);
      setShowPiPreview(false);

      setPiBuyerName(p.buyer_name ?? "");
      setPiBuyerAddress(p.buyer_address ?? "");
      setPiBuyerGstin(p.buyer_gstin ?? "");
      setPiBuyerPhone(p.buyer_phone ?? "");
      setPiPlaceOfSupply(p.place_of_supply ?? "");
      setPiSubject(p.subject ?? "");
      setPiRemarks(p.remarks ?? "");
      setPiTerms(p.terms_and_conditions ?? "");
      setPiBankDetails(p.bank_details ?? "");
      setPiSellerName(p.seller_name ?? "");
      setPiSellerDesignation(p.seller_designation ?? "");
      setPiSellerCompany(p.seller_company ?? "");
      setPiSellerPhone(p.seller_phone ?? "");

      const parsed = parsePiProductRows(p.product_details ?? "");
      const rows = parsed.slice(1).map(([srNo, item, qty, uom, unitPrice, gstPct]) => ({
        srNo,
        item,
        qty,
        uom,
        unitPrice,
        gstPct,
      }));
      setPiProductRows(
        rows.length ? rows : [{ srNo: "1.", item: "", qty: "1", uom: "", unitPrice: "", gstPct: "18" }]
      );
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to edit estimate",
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
      bank_details: bankDetails || d?.bank_details || "",
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
    bankDetails,
    sellerName,
    sellerDesignation,
    sellerCompany,
    sellerPhone,
  ]);

  const previewProductRows = useMemo(
    () => parseProductRows(effective.product_details),
    [effective.product_details]
  );

  const effectivePi = useMemo(() => {
    const d = estimateDefaultsQuery.data;
    return {
      buyer_name: piBuyerName || d?.buyer_name || "",
      buyer_address: piBuyerAddress || d?.buyer_address || "",
      buyer_gstin: piBuyerGstin || d?.buyer_gstin || "",
      buyer_phone: piBuyerPhone || d?.buyer_phone || "",
      place_of_supply: piPlaceOfSupply || d?.place_of_supply || "",
      subject: piSubject || d?.subject || "",
      product_details: buildPiProductDetails(piProductRows, d?.product_details),
      remarks: piRemarks || d?.remarks || "",
      terms_and_conditions: piTerms || d?.terms_and_conditions || "",
      bank_details: piBankDetails || d?.bank_details || "",
      seller_name: piSellerName || d?.seller_name || "",
      seller_designation: piSellerDesignation || d?.seller_designation || "",
      seller_company: piSellerCompany || d?.seller_company || "",
      seller_phone: piSellerPhone || d?.seller_phone || "",
    };
  }, [
    estimateDefaultsQuery.data,
    piBuyerName,
    piBuyerAddress,
    piBuyerGstin,
    piBuyerPhone,
    piPlaceOfSupply,
    piSubject,
    piProductRows,
    piRemarks,
    piTerms,
    piBankDetails,
    piSellerName,
    piSellerDesignation,
    piSellerCompany,
    piSellerPhone,
  ]);

  const previewPiRows = useMemo(
    () => parsePiProductRows(effectivePi.product_details),
    [effectivePi.product_details]
  );

  const piTotals = useMemo(() => {
    const lines = effectivePi.product_details
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    let taxable = 0;
    let gst = 0;
    for (let idx = 0; idx < lines.length; idx++) {
      const parts = lines[idx].split("|").map((p) => p.trim());
      let qty = 1;
      let unit = 0;
      let gPct = 18;
      if (parts.length >= 7) {
        if (idx === 0 && parts[1].toLowerCase() === "item") continue;
        qty = parseFloat(parts[3]) || 1;
        unit = parseFloat(parts[5].replace(/,/g, "")) || 0;
        gPct = parseFloat(parts[6]) || 18;
      } else if (parts.length >= 6) {
        if (idx === 0 && parts[1].toLowerCase() === "item") continue;
        qty = parseFloat(parts[2]) || 1;
        unit = parseFloat(parts[4].replace(/,/g, "")) || 0;
        gPct = parseFloat(parts[5]) || 18;
      } else if (parts.length >= 4) {
        if (idx === 0 && parts[1].toLowerCase() === "item") continue;
        qty = 1;
        unit = parseFloat(parts[2].replace(/,/g, "")) || 0;
        gPct = 18;
      } else {
        continue;
      }
      const t = qty * unit;
      taxable += t;
      gst += t * (gPct / 100);
    }
    return { taxable, gst, total: taxable + gst };
  }, [effectivePi.product_details]);

  const [showPreview, setShowPreview] = useState(false);

  const handleViewQuotation = () => {
    setShowPreview(true);
  };

  const handleViewEstimate = () => {
    setShowPiPreview(true);
  };

  const resetQuotationForm = () => {
    setEditingQuotationId(null);
    setBuyerName("");
    setBuyerAddress("");
    setSubject("");
    setRemarks("");
    setTerms("");
    setBankDetails("");
    setSellerName("");
    setSellerDesignation("");
    setSellerCompany("");
    setSellerPhone("");
    setProductRows([{ srNo: "1.", item: "", rate: "", uom: "" }]);
    setShowPreview(false);
  };

  const resetEstimateForm = () => {
    setEditingProformaId(null);
    setPiBuyerName("");
    setPiBuyerAddress("");
    setPiBuyerGstin("");
    setPiBuyerPhone("");
    setPiPlaceOfSupply("");
    setPiSubject("");
    setPiRemarks("");
    setPiTerms("");
    setPiBankDetails("");
    setPiSellerName("");
    setPiSellerDesignation("");
    setPiSellerCompany("");
    setPiSellerPhone("");
    setPiProductRows([{ srNo: "1.", item: "", qty: "1", uom: "", unitPrice: "", gstPct: "18" }]);
    setShowPiPreview(false);
  };

  const defaults = defaultsQuery.data;
  const estimateDefaults = estimateDefaultsQuery.data;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-display font-bold">Quotations and estimates</h2>
            <p className="text-muted-foreground">
              Create quotation letters and GST-style estimates. Defaults are configured separately for each.
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
                <DialogTitle>Document defaults</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="defaults-quotation" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="defaults-quotation">Quotation</TabsTrigger>
                  <TabsTrigger value="defaults-estimate">Estimate</TabsTrigger>
                </TabsList>
                <TabsContent value="defaults-quotation" className="space-y-4 py-2 mt-4">
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
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Bank details</label>
                        <Textarea
                          defaultValue={defaults.bank_details}
                          rows={4}
                          onBlur={(e) => (defaults.bank_details = e.target.value)}
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
                      <DialogFooter className="sm:justify-end px-0">
                        <Button
                          type="button"
                          disabled={updateDefaultsMutation.isPending}
                          onClick={() => updateDefaultsMutation.mutate(defaults)}
                        >
                          {updateDefaultsMutation.isPending && (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          )}
                          Save quotation defaults
                        </Button>
                      </DialogFooter>
                    </>
                  )}
                </TabsContent>
                <TabsContent value="defaults-estimate" className="space-y-4 py-2 mt-4">
                  {!estimateDefaults && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                  )}
                  {estimateDefaults && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Buyer name</label>
                          <Input
                            defaultValue={estimateDefaults.buyer_name}
                            onBlur={(e) => (estimateDefaults.buyer_name = e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Subject</label>
                          <Input
                            defaultValue={estimateDefaults.subject}
                            onBlur={(e) => (estimateDefaults.subject = e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Buyer GSTIN</label>
                          <Input
                            defaultValue={estimateDefaults.buyer_gstin}
                            onBlur={(e) => (estimateDefaults.buyer_gstin = e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Buyer phone</label>
                          <Input
                            defaultValue={estimateDefaults.buyer_phone}
                            onBlur={(e) => (estimateDefaults.buyer_phone = e.target.value)}
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-sm font-medium">Place of supply</label>
                          <Input
                            defaultValue={estimateDefaults.place_of_supply}
                            onBlur={(e) => (estimateDefaults.place_of_supply = e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Buyer address</label>
                        <Textarea
                          defaultValue={estimateDefaults.buyer_address}
                          rows={3}
                          onBlur={(e) => (estimateDefaults.buyer_address = e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Line items (pipe: Sr|Item|Qty|Uom|UnitPrice|GST%)</label>
                        <Textarea
                          defaultValue={estimateDefaults.product_details}
                          rows={4}
                          onBlur={(e) => (estimateDefaults.product_details = e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Remarks</label>
                        <Textarea
                          defaultValue={estimateDefaults.remarks}
                          rows={3}
                          onBlur={(e) => (estimateDefaults.remarks = e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Terms and Conditions</label>
                        <Textarea
                          defaultValue={estimateDefaults.terms_and_conditions}
                          rows={4}
                          onBlur={(e) => (estimateDefaults.terms_and_conditions = e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Bank details</label>
                        <Textarea
                          defaultValue={estimateDefaults.bank_details}
                          rows={4}
                          onBlur={(e) => (estimateDefaults.bank_details = e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Seller name</label>
                          <Input
                            defaultValue={estimateDefaults.seller_name}
                            onBlur={(e) => (estimateDefaults.seller_name = e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Seller designation</label>
                          <Input
                            defaultValue={estimateDefaults.seller_designation}
                            onBlur={(e) => (estimateDefaults.seller_designation = e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Seller company</label>
                          <Input
                            defaultValue={estimateDefaults.seller_company}
                            onBlur={(e) => (estimateDefaults.seller_company = e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Seller phone</label>
                          <Input
                            defaultValue={estimateDefaults.seller_phone}
                            onBlur={(e) => (estimateDefaults.seller_phone = e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter className="sm:justify-end px-0">
                        <Button
                          type="button"
                          disabled={updateEstimateDefaultsMutation.isPending}
                          onClick={() => updateEstimateDefaultsMutation.mutate(estimateDefaults)}
                        >
                          {updateEstimateDefaultsMutation.isPending && (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          )}
                          Save estimate defaults
                        </Button>
                      </DialogFooter>
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="quotation" className="w-full space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="quotation">Quotations</TabsTrigger>
            <TabsTrigger value="estimate">Estimate</TabsTrigger>
          </TabsList>

          <TabsContent value="quotation" className="space-y-6 mt-4">
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
              <div className="space-y-2">
                <label className="text-sm font-medium">Bank details</label>
                <Textarea
                  value={bankDetails}
                  onChange={(e) => setBankDetails(e.target.value)}
                  placeholder={defaults?.bank_details || ""}
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
                <div className="text-[15px] border rounded-lg bg-white overflow-hidden">
                  <img
                    src="/quotation-top.png"
                    alt="Quotation header"
                    className="w-full h-auto"
                  />

                  <div className="px-6 pt-5 pb-0 space-y-0 leading-relaxed">
                    <div className="flex justify-between text-[14px]">
                      <span>{`Ref: SLTMS/ ${new Date().getFullYear()}-${String(
                        (new Date().getFullYear() + 1).toString().slice(-2)
                      )}/ 001`}</span>
                      <span>{`Dated: ${new Date().toLocaleDateString("en-GB")}`}</span>
                    </div>
                    <p className="mt-2 text-center font-bold tracking-wide text-[16px]">QUOTATION</p>

                    <p className="mt-5">To,</p>
                    <p className="font-bold">{effective.buyer_name}</p>
                    {effective.buyer_address.split("\n").map((l, idx) => (
                      <p key={idx}>{l}</p>
                    ))}

                    <p className="mt-4 font-bold">{`Sub: ${effective.subject}`}</p>

                    <p className="mt-4">Dear Sir,</p>
                    <p>As per telephonic conversation, please find below rates for items discussed –</p>

                    <div className="mt-4 border border-black">
                      <table className="w-full border-collapse text-sm">
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

                    <p className="mt-4">
                      For any clarification or order confirmation, please feel free to contact us.
                    </p>
                    <p>Thanks and Regards</p>

                    <p className="mt-4 font-bold">{effective.seller_name}</p>
                    <p className="font-bold">{effective.seller_designation}</p>
                    <p className="font-bold">{effective.seller_company}</p>
                    <p>{effective.seller_phone}</p>

                    {effective.bank_details && (
                      <div className="mt-4 border border-black rounded-sm p-3">
                        <p className="font-bold">Bank Details:</p>
                        <div className="whitespace-pre-line">{effective.bank_details}</div>
                      </div>
                    )}
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
          </TabsContent>

          <TabsContent value="estimate" className="space-y-6 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" /> Create estimate
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Buyer name</label>
                      <Input
                        value={piBuyerName}
                        onChange={(e) => setPiBuyerName(e.target.value)}
                        placeholder={estimateDefaults?.buyer_name || "Buyer name"}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Subject (optional)</label>
                      <Input
                        value={piSubject}
                        onChange={(e) => setPiSubject(e.target.value)}
                        placeholder={estimateDefaults?.subject || "Subject"}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Buyer address</label>
                    <Textarea
                      value={piBuyerAddress}
                      onChange={(e) => setPiBuyerAddress(e.target.value)}
                      placeholder={estimateDefaults?.buyer_address || "Buyer address"}
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Buyer GSTIN</label>
                      <Input
                        value={piBuyerGstin}
                        onChange={(e) => setPiBuyerGstin(e.target.value)}
                        placeholder={estimateDefaults?.buyer_gstin || "e.g. 20AAGCM7457A1ZV"}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Buyer contact</label>
                      <Input
                        value={piBuyerPhone}
                        onChange={(e) => setPiBuyerPhone(e.target.value)}
                        placeholder={estimateDefaults?.buyer_phone || "Phone"}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium">Place of supply</label>
                      <Input
                        value={piPlaceOfSupply}
                        onChange={(e) => setPiPlaceOfSupply(e.target.value)}
                        placeholder={estimateDefaults?.place_of_supply || "e.g. 20-Jharkhand"}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Line items (quantity, unit price, GST %)</label>
                    <div className="border rounded-md overflow-x-auto">
                      <table className="w-full text-xs min-w-[560px]">
                        <thead>
                          <tr className="bg-muted/40">
                            <th className="text-left px-1 py-1 w-12">Sr</th>
                            <th className="text-left px-1 py-1">Item</th>
                            <th className="text-left px-1 py-1 w-14">Quantity</th>
                            <th className="text-left px-1 py-1 w-16">Uom</th>
                            <th className="text-left px-1 py-1 w-20">Price</th>
                            <th className="text-left px-1 py-1 w-14">GST%</th>
                            <th className="w-8" />
                          </tr>
                        </thead>
                        <tbody>
                          {piProductRows.map((row, idx) => (
                            <tr key={idx} className="border-t">
                              <td className="px-1 py-1 align-top">
                                <Input
                                  value={row.srNo}
                                  onChange={(e) => {
                                    const next = [...piProductRows];
                                    next[idx] = { ...next[idx], srNo: e.target.value };
                                    setPiProductRows(next);
                                  }}
                                  className="h-7 text-xs"
                                />
                              </td>
                              <td className="px-1 py-1 align-top">
                                <Input
                                  value={row.item}
                                  onChange={(e) => {
                                    const next = [...piProductRows];
                                    next[idx] = { ...next[idx], item: e.target.value };
                                    setPiProductRows(next);
                                  }}
                                  className="h-7 text-xs"
                                />
                              </td>
                              <td className="px-1 py-1 align-top">
                                <Input
                                  value={row.qty}
                                  onChange={(e) => {
                                    const next = [...piProductRows];
                                    next[idx] = { ...next[idx], qty: e.target.value };
                                    setPiProductRows(next);
                                  }}
                                  className="h-7 text-xs"
                                />
                              </td>
                              <td className="px-1 py-1 align-top">
                                <Input
                                  value={row.uom}
                                  onChange={(e) => {
                                    const next = [...piProductRows];
                                    next[idx] = { ...next[idx], uom: e.target.value };
                                    setPiProductRows(next);
                                  }}
                                  className="h-7 text-xs"
                                />
                              </td>
                              <td className="px-1 py-1 align-top">
                                <Input
                                  value={row.unitPrice}
                                  onChange={(e) => {
                                    const next = [...piProductRows];
                                    next[idx] = { ...next[idx], unitPrice: e.target.value };
                                    setPiProductRows(next);
                                  }}
                                  className="h-7 text-xs"
                                />
                              </td>
                              <td className="px-1 py-1 align-top">
                                <Input
                                  value={row.gstPct}
                                  onChange={(e) => {
                                    const next = [...piProductRows];
                                    next[idx] = { ...next[idx], gstPct: e.target.value };
                                    setPiProductRows(next);
                                  }}
                                  className="h-7 text-xs"
                                />
                              </td>
                              <td className="px-0 py-1 align-top">
                                {piProductRows.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive"
                                    onClick={() =>
                                      setPiProductRows(piProductRows.filter((_, i) => i !== idx))
                                    }
                                  >
                                    ×
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-1">
                      <span>Leave rows blank to use default line items from estimate defaults.</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={() =>
                          setPiProductRows((rows) => [
                            ...rows,
                            {
                              srNo: `${rows.length + 1}.`,
                              item: "",
                              qty: "1",
                              uom: "",
                              unitPrice: "",
                              gstPct: "18",
                            },
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
                      value={piRemarks}
                      onChange={(e) => setPiRemarks(e.target.value)}
                      placeholder={defaults?.remarks || ""}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Terms and Conditions</label>
                    <Textarea
                      value={piTerms}
                      onChange={(e) => setPiTerms(e.target.value)}
                      placeholder={defaults?.terms_and_conditions || ""}
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Bank details</label>
                    <Textarea
                      value={piBankDetails}
                      onChange={(e) => setPiBankDetails(e.target.value)}
                      placeholder={defaults?.bank_details || ""}
                      rows={4}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Seller name</label>
                      <Input
                        value={piSellerName}
                        onChange={(e) => setPiSellerName(e.target.value)}
                        placeholder={defaults?.seller_name || ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Seller designation</label>
                      <Input
                        value={piSellerDesignation}
                        onChange={(e) => setPiSellerDesignation(e.target.value)}
                        placeholder={defaults?.seller_designation || ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Seller company</label>
                      <Input
                        value={piSellerCompany}
                        onChange={(e) => setPiSellerCompany(e.target.value)}
                        placeholder={defaults?.seller_company || ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Seller phone</label>
                      <Input
                        value={piSellerPhone}
                        onChange={(e) => setPiSellerPhone(e.target.value)}
                        placeholder={defaults?.seller_phone || ""}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={handleViewEstimate}>
                      View estimate
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        if (editingProformaId) {
                          updateProformaMutation.mutate();
                        } else {
                          createProformaMutation.mutate();
                        }
                      }}
                      disabled={createProformaMutation.isPending || updateProformaMutation.isPending}
                    >
                      {(editingProformaId ? updateProformaMutation.isPending : createProformaMutation.isPending) && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      {editingProformaId ? "Update & Download PDF" : "Save & Download PDF"}
                    </Button>
                    {editingProformaId && (
                      <Button type="button" variant="outline" onClick={resetEstimateForm}>
                        <X className="w-4 h-4 mr-2" />
                        Cancel edit
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-dashed border-primary/40">
                <CardHeader>
                  <CardTitle>Estimate preview</CardTitle>
                </CardHeader>
                <CardContent>
                  {!showPiPreview ? (
                    <p className="text-sm text-muted-foreground">
                      Click <span className="font-semibold">View estimate</span> to preview with estimate defaults
                      applied.
                    </p>
                  ) : (
                    <div className="text-[13px] border rounded-lg bg-white overflow-hidden overflow-x-auto">
                      <img src="/quotation-top.png" alt="" className="w-full h-auto min-w-[520px]" />
                      <div className="px-4 pt-4 pb-2 space-y-2 leading-snug min-w-[520px]">
                        <p className="text-center font-bold text-[15px]">Estimate</p>
                        <div className="grid grid-cols-2 gap-4 text-[12px]">
                          <div>
                            <p className="font-bold">Estimate For:</p>
                            <p className="font-bold">{effectivePi.buyer_name}</p>
                            <div className="whitespace-pre-line">{effectivePi.buyer_address}</div>
                            {effectivePi.buyer_phone ? <p>Contact No: {effectivePi.buyer_phone}</p> : null}
                            {effectivePi.buyer_gstin ? <p>GSTIN: {effectivePi.buyer_gstin}</p> : null}
                          </div>
                          <div>
                            <p className="font-bold">Estimate Details:</p>
                            <p>No: (on save)</p>
                            <p>Date: {new Date().toLocaleDateString("en-GB")}</p>
                            {effectivePi.place_of_supply ? (
                              <p>Place Of Supply: {effectivePi.place_of_supply}</p>
                            ) : null}
                          </div>
                        </div>
                        <div className="border border-black text-[11px] mt-2">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-muted/30">
                                <th className="border border-black px-1 py-0.5 text-left">#</th>
                                <th className="border border-black px-1 py-0.5 text-left">Item</th>
                                <th className="border border-black px-1 py-0.5 text-left">Quantity</th>
                                <th className="border border-black px-1 py-0.5 text-left">Uom</th>
                                <th className="border border-black px-1 py-0.5 text-left">Unit Price (₹)</th>
                                <th className="border border-black px-1 py-0.5 text-left">GST</th>
                                <th className="border border-black px-1 py-0.5 text-left">Amt</th>
                              </tr>
                            </thead>
                            <tbody>
                              {previewPiRows.slice(1).map((row, idx) => {
                                const qty = parseFloat(row[2]) || 1;
                                const unit = parseFloat(row[4].replace(/,/g, "")) || 0;
                                const gPct = parseFloat(row[5]) || 18;
                                const taxable = qty * unit;
                                const gst = taxable * (gPct / 100);
                                const tot = taxable + gst;
                                return (
                                  <tr key={idx}>
                                    <td className="border border-black px-1 py-0.5">{idx + 1}</td>
                                    <td className="border border-black px-1 py-0.5">{row[1]}</td>
                                    <td className="border border-black px-1 py-0.5">{row[2]}</td>
                                    <td className="border border-black px-1 py-0.5">{row[3]}</td>
                                    <td className="border border-black px-1 py-0.5">
                                      ₹{unit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="border border-black px-1 py-0.5">
                                      ({gPct}%) ₹{gst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="border border-black px-1 py-0.5">
                                      ₹{tot.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        <p className="font-semibold text-[12px]">
                          Sub Total : ₹{piTotals.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </p>
                        <p className="font-semibold text-[12px]">
                          Total : ₹{piTotals.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </p>
                        {effectivePi.remarks ? (
                          <div className="text-[11px] whitespace-pre-line">{effectivePi.remarks}</div>
                        ) : null}
                        <p className="font-bold text-[12px]">Terms & Conditions:</p>
                        <div className="text-[11px] whitespace-pre-line">
                          {effectivePi.terms_and_conditions}
                        </div>
                        {effectivePi.bank_details ? (
                          <div className="border border-black rounded-sm p-2 text-[11px] whitespace-pre-line">
                            <span className="font-bold">Bank Details:</span>
                            <br />
                            {effectivePi.bank_details}
                          </div>
                        ) : null}
                        <p className="text-[11px] pt-2">
                          For <span className="font-semibold">{effectivePi.seller_company}</span>: Authorized
                          Signatory
                        </p>
                      </div>
                      <img src="/quotation-bottom.png" alt="" className="w-full h-auto min-w-[520px] mt-2" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" /> Saved estimates
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {proformaInvoicesQuery.isLoading ? (
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
                            const rows = proformaInvoicesQuery.data ?? [];
                            const total = rows.length;
                            const safePageSize = Math.max(1, piPageSize);
                            const totalPages = Math.max(1, Math.ceil(total / safePageSize));
                            const safePage = Math.min(Math.max(1, piPage), totalPages);
                            const offset = (safePage - 1) * safePageSize;
                            const paged = rows.slice(offset, offset + safePageSize);
                            if (paged.length === 0) {
                              return (
                                <TableRow>
                                  <TableCell
                                    colSpan={5}
                                    className="text-center py-8 text-muted-foreground"
                                  >
                                    No estimates saved yet.
                                  </TableCell>
                                </TableRow>
                              );
                            }
                            return paged.map((q) => (
                              <TableRow key={q.id}>
                                <TableCell className="font-mono text-xs text-muted-foreground">{q.id}</TableCell>
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
                                      onClick={() => handleEditProforma(q.id)}
                                      aria-label="Edit estimate"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={async () => {
                                        try {
                                          const r = await authFetch(`/api/proforma-invoices/${q.id}/pdf`);
                                          if (!r.ok) throw new Error("Failed to download PDF");
                                          const blob = await r.blob();
                                          const url = URL.createObjectURL(blob);
                                          const a = document.createElement("a");
                                          a.href = url;
                                          a.download = `Estimate-${String(q.id).padStart(3, "0")}.pdf`;
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
                                      aria-label="Download estimate PDF"
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
                      totalCount={(proformaInvoicesQuery.data ?? []).length}
                      page={piPage}
                      pageSize={piPageSize}
                      onPageChange={setPiPage}
                      onPageSizeChange={setPiPageSize}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
