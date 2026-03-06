import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useLocation } from "wouter";
import { z } from "zod";
import { authFetch } from "@/lib/authFetch";

type LoginInput = z.infer<typeof api.auth.login.input>;

const loginResponseSchema = z.object({ access_token: z.string(), token_type: z.string() });

export function useAuth() {
  const queryClient = useQueryClient();
  const [_, setLocation] = useLocation();

  const userQuery = useQuery({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      const res = await authFetch(api.auth.me.path);
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch user");
      return api.auth.me.responses[200].parse(await res.json());
    },
    retry: false,
    staleTime: Infinity,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginInput) => {
      const body = new URLSearchParams({
        username: credentials.username,
        password: credentials.password,
      });
      const res = await authFetch(api.auth.login.path, {
        method: api.auth.login.method,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });

      if (!res.ok) {
        if (res.status === 401) throw new Error("Invalid username or password");
        throw new Error("Login failed");
      }

      const { access_token } = loginResponseSchema.parse(await res.json());
      localStorage.setItem("token", access_token);

      const userRes = await authFetch(api.auth.me.path);
      if (!userRes.ok) throw new Error("Failed to load user after login");
      return api.auth.me.responses[200].parse(await userRes.json());
    },
    onSuccess: (user) => {
      queryClient.setQueryData([api.auth.me.path], user);
      setLocation("/");
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        await authFetch(api.auth.logout.path, { method: api.auth.logout.method });
      } finally {
        localStorage.removeItem("token");
      }
    },
    onSuccess: () => {
      queryClient.setQueryData([api.auth.me.path], null);
      setLocation("/login");
    },
  });

  return {
    user: userQuery.data,
    isLoading: userQuery.isLoading,
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
  };
}
