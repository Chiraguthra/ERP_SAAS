import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/lib/authFetch";

export type RetailerData = {
  id?: number;
  name?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pinCode?: string | null;
  country?: string | null;
  gstin?: string | null;
  pan?: string | null;
};

const RETAILER_KEY = ["/api/retailer"];

export function useRetailer() {
  const queryClient = useQueryClient();

  const retailerQuery = useQuery({
    queryKey: RETAILER_KEY,
    queryFn: async (): Promise<RetailerData> => {
      const res = await authFetch("/api/retailer");
      if (!res.ok) throw new Error("Failed to fetch retailer");
      return res.json();
    },
  });

  const updateRetailerMutation = useMutation({
    mutationFn: async (data: RetailerData) => {
      const res = await authFetch("/api/retailer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? err.message ?? "Failed to save retailer");
      }
      return res.json() as Promise<RetailerData>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RETAILER_KEY });
    },
  });

  return {
    retailer: retailerQuery.data ?? null,
    isLoading: retailerQuery.isLoading,
    updateRetailer: updateRetailerMutation.mutate,
    isUpdating: updateRetailerMutation.isPending,
  };
}
