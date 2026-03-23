import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import { CreateOrderRequest } from "@shared/schema";
import { authFetch } from "@/lib/authFetch";

type ListParams = {
  q?: string;
  status?: string | null;
  page?: number;
  pageSize?: number;
};
const MAX_PAGE_SIZE = 200;

export function useOrders(params: ListParams = {}) {
  const queryClient = useQueryClient();
  const { q = "", status = null, page = 1, pageSize = 25 } = params;
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize));
  const offset = (safePage - 1) * safePageSize;

  const ordersQuery = useQuery({
    queryKey: [api.orders.list.path, q, status, safePage, safePageSize],
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
    queryFn: async () => {
      const sp = new URLSearchParams();
      sp.set("limit", String(safePageSize));
      sp.set("offset", String(offset));
      if (q.trim()) sp.set("q", q.trim());
      if (status) sp.set("status", status);
      const res = await authFetch(`${api.orders.list.path}?${sp.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch orders");
      const raw = await res.json();
      const parsed = api.orders.list.responses[200].safeParse(raw);
      if (parsed.success) return parsed.data;
      return { items: [], total: 0, offset, limit: safePageSize };
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: CreateOrderRequest) => {
      const res = await authFetch(api.orders.create.path, {
        method: api.orders.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.detail ?? error.message ?? "Failed to create order");
      }
      const raw = await res.json();
      try {
        return api.orders.create.responses[201].parse(raw);
      } catch {
        return raw;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.analytics.get.path] });
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const url = buildUrl("/api/orders/:id", { id: orderId });
      const res = await authFetch(url, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? err.message ?? "Failed to delete order");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.analytics.get.path] });
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, ...payload }: { id: number } & Record<string, unknown>) => {
      const url = buildUrl("/api/orders/:id", { id });
      const res = await authFetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? err.message ?? "Failed to update order");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.analytics.get.path] });
    },
  });

  return {
    orders: ordersQuery.data?.items ?? [],
    total: ordersQuery.data?.total ?? 0,
    isLoading: ordersQuery.isLoading,
    createOrder: createOrderMutation.mutate,
    isCreating: createOrderMutation.isPending,
    deleteOrder: deleteOrderMutation.mutate,
    isDeleting: deleteOrderMutation.isPending,
    updateOrder: updateOrderMutation.mutate,
    isUpdating: updateOrderMutation.isPending,
  };
}

export function useOrder(id: number) {
  const queryClient = useQueryClient();
  
  const orderQuery = useQuery({
    queryKey: [api.orders.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.orders.get.path, { id });
      const res = await authFetch(url);
      if (!res.ok) throw new Error("Failed to fetch order details");
      return api.orders.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status }: { status: string }) => {
      const url = buildUrl(api.orders.updateStatus.path, { id });
      const res = await authFetch(url, {
        method: api.orders.updateStatus.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return api.orders.updateStatus.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.orders.get.path, id] });
      queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.analytics.get.path] });
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: async (payload: {
      billId?: string | null;
      contactNumber?: string | null;
      deliveryNote?: string | null;
      referenceNo?: string | null;
      buyersOrderNo?: string | null;
      dispatchDocNo?: string | null;
      dispatchedThrough?: string | null;
      modeTermsOfPayment?: string | null;
      otherReferences?: string | null;
      deliveryNoteDate?: string | null;
      destination?: string | null;
      termsOfDelivery?: string | null;
      freightCharges?: number;
      adjustments?: number;
      cgstPercent?: number | null;
      sgstPercent?: number | null;
      igstPercent?: number | null;
      items?: { productId: number; quantity: number; price?: number }[];
    }) => {
      const url = buildUrl("/api/orders/:id", { id });
      const res = await authFetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update order");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.orders.get.path, id] });
      queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.analytics.get.path] });
    },
  });

  const updateDispatchItemsMutation = useMutation({
    mutationFn: async (payload: { dispatchedItemIds: number[] }) => {
      const url = buildUrl("/api/orders/:id/dispatch-items", { id });
      const res = await authFetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update dispatch items");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.orders.get.path, id] });
      queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.analytics.get.path] });
    },
  });

  return {
    order: orderQuery.data,
    isLoading: orderQuery.isLoading,
    updateStatus: updateStatusMutation.mutate,
    isUpdating: updateStatusMutation.isPending,
    updateOrder: updateOrderMutation.mutate,
    isUpdatingOrder: updateOrderMutation.isPending,
    updateDispatchItems: updateDispatchItemsMutation.mutate,
    isUpdatingDispatchItems: updateDispatchItemsMutation.isPending,
  };
}
