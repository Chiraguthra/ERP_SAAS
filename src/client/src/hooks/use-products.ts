import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import { insertProductSchema } from "@shared/schema";
import { authFetch } from "@/lib/authFetch";

type ProductInput = z.infer<typeof insertProductSchema>;

type ListParams = {
  q?: string;
  page?: number;
  pageSize?: number;
};
const MAX_PAGE_SIZE = 200;

export function useProducts(params: ListParams = {}) {
  const queryClient = useQueryClient();
  const { q = "", page = 1, pageSize = 25 } = params;
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize));
  const offset = (safePage - 1) * safePageSize;

  const productsQuery = useQuery({
    queryKey: [api.products.list.path, q, safePage, safePageSize],
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
    queryFn: async () => {
      const sp = new URLSearchParams();
      sp.set("limit", String(safePageSize));
      sp.set("offset", String(offset));
      if (q.trim()) sp.set("q", q.trim());
      const res = await authFetch(`${api.products.list.path}?${sp.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch products");
      const raw = await res.json();
      const parsed = api.products.list.responses[200].safeParse(raw);
      return parsed.success ? parsed.data : { items: [], total: 0, offset, limit: safePageSize };
    },
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: Partial<ProductInput> & Record<string, unknown>) => {
      const res = await authFetch(api.products.create.path, {
        method: api.products.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = Array.isArray(err.detail)
          ? err.detail.map((e: { msg?: string }) => e.msg).filter(Boolean).join("; ") || res.statusText
          : err.detail ?? err.message ?? "Failed to create product";
        throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
      }
      const raw = await res.json();
      const parsed = api.products.create.responses[201].safeParse(raw);
      return parsed.success ? parsed.data : raw;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<ProductInput> & Record<string, unknown>) => {
      const url = buildUrl(api.products.update.path, { id });
      const res = await authFetch(url, {
        method: api.products.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = Array.isArray(err.detail)
          ? err.detail.map((e: { msg?: string }) => e.msg).filter(Boolean).join("; ") || res.statusText
          : err.detail ?? err.message ?? "Failed to update product";
        throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
      }
      const raw = await res.json();
      const parsed = api.products.update.responses[200].safeParse(raw);
      return parsed.success ? parsed.data : raw;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.products.delete.path, { id });
      const res = await authFetch(url, { method: api.products.delete.method });
      if (!res.ok) throw new Error("Failed to delete product");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
    },
  });

  return {
    products: productsQuery.data?.items ?? [],
    total: productsQuery.data?.total ?? 0,
    isLoading: productsQuery.isLoading,
    createProduct: createProductMutation.mutate,
    updateProduct: updateProductMutation.mutate,
    deleteProduct: deleteProductMutation.mutate,
    isCreating: createProductMutation.isPending,
    isUpdating: updateProductMutation.isPending,
    isDeleting: deleteProductMutation.isPending,
  };
}
