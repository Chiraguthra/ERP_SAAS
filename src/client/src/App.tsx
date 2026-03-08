import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Sidebar } from "@/components/Sidebar";
import Dashboard from "@/pages/Dashboard";
import Orders from "@/pages/Orders";
import OrderDetail from "@/pages/OrderDetail";
import Products from "@/pages/Products";
import Customers from "@/pages/Customers";
import Quotations from "@/pages/Quotations";
import Finance from "@/pages/Finance";
import Procurement from "@/pages/Procurement";
import Warehouses from "@/pages/Warehouses";
import Reports from "@/pages/Reports";
import Organizations from "@/pages/Organizations";
import Users from "@/pages/Users";
import Retailer from "@/pages/Retailer";
import Logistics from "@/pages/Logistics";
import LogisticsDashboard from "@/pages/LogisticsDashboard";
import SalesLeads from "@/pages/SalesLeads";
import Login from "@/pages/Login";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Menu, X } from "lucide-react";
import { useState } from "react";
import { RateEnquiryButton } from "@/components/RateEnquiryButton";

function Router() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar className="hidden md:flex" />

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            aria-label="Close menu overlay"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-50 h-full w-64">
            <Sidebar mobile onNavigate={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex flex-col flex-1 md:pl-64 min-w-0">
        <header className="flex items-center justify-between p-3 sm:p-4 border-b bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="inline-flex md:hidden h-9 w-9 items-center justify-center rounded-md border border-border bg-background"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <h1 className="text-xl font-semibold">Manager</h1>
          </div>
          <div className="flex items-center gap-2">
            <RateEnquiryButton />
          </div>
        </header>
        <main className="flex-1 overflow-auto min-w-0">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/orders/:id" component={OrderDetail} />
            <Route path="/orders" component={Orders} />
            <Route path="/products" component={Products} />
            <Route path="/customers" component={Customers} />
            <Route path="/quotations" component={Quotations} />
            <Route path="/finance" component={Finance} />
            <Route path="/procurement" component={Procurement} />
            <Route path="/warehouses" component={Warehouses} />
            <Route path="/reports" component={Reports} />
            <Route path="/organizations" component={Organizations} />
            <Route path="/users" component={Users} />
            <Route path="/retailer" component={Retailer} />
            <Route path="/logistics" component={Logistics} />
            <Route path="/logistics-dashboard" component={LogisticsDashboard} />
            <Route path="/sales-leads" component={SalesLeads} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  const getDefaultRouteForRole = (role?: string) => {
    const r = (role || "").toLowerCase();
    if (r === "admin") return "/";
    if (r === "sales") return "/sales-leads";
    if (r === "logistics") return "/logistics";
    if (r === "accountant") return "/finance";
    return "/orders";
  };

  if (location === "/login") {
    if (user) return <Redirect to="/" />;
    return <Login />;
  }
  if (!isLoading && !user) {
    return <Redirect to="/login" />;
  }
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  const userRole = (user?.role ?? "").toLowerCase();
  if (userRole === "sales" && location !== "/sales-leads" && location !== "/login") {
    return <Redirect to="/sales-leads" />;
  }
  if (location === "/" && userRole !== "admin") {
    return <Redirect to={getDefaultRouteForRole(user?.role)} />;
  }
  return <Router />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppRoutes />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
