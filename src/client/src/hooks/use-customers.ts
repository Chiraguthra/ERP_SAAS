import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import { insertCustomerSchema } from "@shared/schema";
import { authFetch } from "@/lib/authFetch";

type CustomerInput = z.infer<typeof insertCustomerSchema>;

type ListParams = {
  q?: string;
  page?: number;
  pageSize?: number;
};
const MAX_PAGE_SIZE = 200;

export function useCustomers(params: ListParams = {}) {
  const queryClient = useQueryClient();
  const { q = "", page = 1, pageSize = 25 } = params;
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize));
  const offset = (safePage - 1) * safePageSize;

  const customersQuery = useQuery({
    queryKey: [api.customers.list.path, q, safePage, safePageSize],
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
    queryFn: async () => {
      const sp = new URLSearchParams();
      sp.set("limit", String(safePageSize));
      sp.set("offset", String(offset));
      if (q.trim()) sp.set("q", q.trim());
      const res = await authFetch(`${api.customers.list.path}?${sp.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch customers");
      const raw = await res.json();
      const parsed = api.customers.list.responses[200].safeParse(raw);
      return parsed.success ? parsed.data : { items: [], total: 0, offset, limit: safePageSize };
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (data: Partial<CustomerInput> & Record<string, unknown>) => {
      const res = await authFetch(api.customers.create.path, {
        method: api.customers.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? err.message ?? "Failed to create customer");
      }
      const raw = await res.json();
      const parsed = api.customers.create.responses[201].safeParse(raw);
      return parsed.success ? parsed.data : raw;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.customers.list.path] });
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Record<string, unknown>) => {
      const url = buildUrl(api.customers.update.path, { id });
      const res = await authFetch(url, {
        method: api.customers.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? err.message ?? "Failed to update customer");
      }
      const raw = await res.json();
      const parsed = api.customers.update.responses[200].safeParse(raw);
      return parsed.success ? parsed.data : raw;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.customers.list.path] });
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.customers.delete.path, { id });
      const res = await authFetch(url, { method: api.customers.delete.method });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? err.message ?? "Failed to delete customer");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.customers.list.path] });
    },
  });

  return {
    customers: customersQuery.data?.items ?? [],
    total: customersQuery.data?.total ?? 0,
    isLoading: customersQuery.isLoading,
    createCustomer: createCustomerMutation.mutate,
    updateCustomer: updateCustomerMutation.mutate,
    deleteCustomer: deleteCustomerMutation.mutate,
    isCreating: createCustomerMutation.isPending,
    isUpdating: updateCustomerMutation.isPending,
    isDeleting: deleteCustomerMutation.isPending,
  };
}
