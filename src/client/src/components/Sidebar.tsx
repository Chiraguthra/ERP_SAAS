import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  LogOut,
  PackageOpen,
  Store,
  Banknote,
  FileText,
  Truck,
  Warehouse,
  BarChart3,
  Building2,
  UserCog,
  MapPin,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MouseEventHandler } from "react";

type NavLink = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];  // if set, only these roles see it
};

type SidebarProps = {
  className?: string;
  mobile?: boolean;
  onNavigate?: () => void;
};

export function Sidebar({ className, mobile = false, onNavigate }: SidebarProps) {
  const [location] = useLocation();
  const { logout, user } = useAuth();

  const allLinks: NavLink[] = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin"] },
    { href: "/orders", label: "Orders", icon: ShoppingCart, roles: ["admin", "staff"] },
    { href: "/products", label: "Products & Stock", icon: Package, roles: ["admin", "staff"] },
    { href: "/customers", label: "Customers", icon: Users, roles: ["admin", "staff"] },
    { href: "/sales-leads", label: "Customer / Sales Lead", icon: UserPlus, roles: ["admin", "staff", "sales"] },
    { href: "/quotations", label: "Quotations", icon: FileText, roles: ["admin", "staff"] },
    { href: "/finance", label: "Finance", icon: Banknote, roles: ["admin", "accountant"] },
    { href: "/procurement", label: "Procurement", icon: Truck, roles: ["admin", "staff"] },
    { href: "/warehouses", label: "Warehouses", icon: Warehouse, roles: ["admin", "staff"] },
    { href: "/logistics", label: "Logistics", icon: MapPin, roles: ["admin", "logistics"] },
    { href: "/logistics-dashboard", label: "Logistics Dashboard", icon: BarChart3, roles: ["admin", "logistics"] },
    { href: "/reports", label: "Reports", icon: BarChart3, roles: ["admin", "accountant"] },
    { href: "/retailer", label: "Retailer", icon: Store, roles: ["admin", "staff"] },
    { href: "/organizations", label: "Organizations", icon: Building2, roles: ["admin"] },
    { href: "/users", label: "Users", icon: UserCog, roles: ["admin"] },
  ];

  const userRole = user?.role?.toLowerCase() ?? "";
  const links = allLinks.filter((link) => {
    if (!link.roles) return true; // visible to all
    return link.roles.includes(userRole);
  });

  return (
    <div
      className={cn(
        "w-64 bg-card border-r flex flex-col overflow-hidden",
        mobile ? "h-full" : "fixed left-0 top-0 z-10 h-screen",
        className
      )}
    >
      <div className="p-6 border-b flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <PackageOpen className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="font-display font-bold text-lg leading-none">SILVERLINE TECHNO</h1>
          <p className="text-xs text-muted-foreground font-medium">Management Services</p>
        </div>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto p-4 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location === link.href;
          
          const handleNavClick: MouseEventHandler<HTMLAnchorElement> = () => {
            onNavigate?.();
          };

          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={handleNavClick}
              className={cn("sidebar-link", isActive && "active")}
            >
              <Icon className={cn("w-5 h-5", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t bg-muted/30 shrink-0">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
            {user?.name?.charAt(0) || "U"}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-semibold truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={() => {
            logout();
            onNavigate?.();
          }}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
