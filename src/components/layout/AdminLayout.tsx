import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Users,
  Wallet,
  HandCoins,
  Landmark,
  ShieldCheck,
  Settings,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  ScrollText,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useStaffRole } from "@/hooks/useStaffRole";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { staffRoleLabel } from "@/lib/staff-roles";
type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Visible to ops + superadmin */
  complianceOnly?: boolean;
  /** Visible to superadmin only */
  platformAdminOnly?: boolean;
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Accounts", href: "/accounts", icon: Building2 },
  { label: "Members", href: "/members", icon: Users },
  { label: "Funds", href: "/funds", icon: Wallet },
  { label: "Contributions", href: "/contributions", icon: HandCoins },
  { label: "Audit log", href: "/audit", icon: ScrollText },
  { label: "Settlements", href: "/settlements", icon: Landmark, complianceOnly: true },
  { label: "KYC", href: "/kyc", icon: ShieldCheck, complianceOnly: true },
  { label: "Staff", href: "/settings/staff", icon: Settings, platformAdminOnly: true },
  { label: "Profile", href: "/profile", icon: UserRound },
];

const envLabel = import.meta.env.VITE_APP_ENV || import.meta.env.MODE;

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { profile, role, canMutateCompliance, canManagePlatform } = useStaffRole();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isDark = theme === "dark";

  const visibleNav = navItems.filter((item) => {
    if (item.platformAdminOnly) return canManagePlatform;
    if (item.complianceOnly) return canMutateCompliance;
    return true;
  });

  const handleSignOut = async () => {
    await logout();
    navigate("/signin", { replace: true });
  };

  const NavLinks = () => (
    <>
      {visibleNav.map((item) => {
        const active =
          item.href === "/"
            ? location.pathname === "/"
            : location.pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            to={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="p-4 border-b border-sidebar-border">
          <p className="font-semibold tracking-tight">Pollean Admin</p>
          <p className="text-xs text-sidebar-foreground/60 mt-0.5">System operations</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <NavLinks />
        </nav>
        <div className="p-4 border-t border-sidebar-border text-xs text-sidebar-foreground/60">
          Platform-wide · GHS · Africa/Accra
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b bg-card flex items-center justify-between px-4 gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen((o) => !o)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            {envLabel !== "production" && (
              <Badge variant="warning" className="uppercase text-[10px]">
                {envLabel}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium leading-tight">
                {profile?.full_name || profile?.email || "Staff"}
              </p>
              {role && (
                <p className="text-xs text-muted-foreground">{staffRoleLabel(role)}</p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-1" />
              Sign out
            </Button>
          </div>
        </header>

        {/* Mobile nav drawer */}
        {mobileOpen && (
          <div className="md:hidden border-b bg-sidebar p-3 space-y-1">
            <NavLinks />
          </div>
        )}

        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
