/**
 * Fetch with Authorization: Bearer <token> when user is logged in.
 * Use for all API requests so the backend can authenticate.
 */
export function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  const token = localStorage.getItem("token");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...options, headers }).then((res) => {
    const isLoginCall = url.includes("/api/login");
    if (res.status === 401 && !isLoginCall) {
      localStorage.removeItem("token");
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return res;
  });
}
