"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import {
  Home,
  Building2,
  Users,
  Shield,
  FileText,
  UserSquare,
  Utensils,
  Map,
  List,
  ChevronLeft,
  Menu,
  LogOut,
  X,
  UserPlus,
  Bed,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type Role = "MAIN_ADMIN" | "WARDEN" | "TENANT";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

// ─── Navigation Config per Role ──────────────────────────────────────────────

const NAV_CONFIG: Record<Role, NavGroup[]> = {
  MAIN_ADMIN: [
    {
      label: "Overview",
      items: [
        { label: "Dashboard", href: "/admin", icon: Home },
        { label: "Hostels", href: "/admin/hostels", icon: Building2 },
        { label: "All Users", href: "/admin/users", icon: Users },
        { label: "Wardens", href: "/admin/wardens", icon: Shield },
      ],
    },
    {
      label: "Operations",
      items: [
        { label: "Onboards", href: "/admin/onboards", icon: FileText },
        { label: "Leads", href: "/admin/leads", icon: UserSquare },
      ],
    },
    {
      label: "Hostel Tools",
      items: [
        { label: "Food Dashboard", href: "/warden/food", icon: Utensils },
        { label: "Occupancy", href: "/warden/occupancy", icon: Map },
        { label: "Worklists", href: "/warden/worklists", icon: List },
      ],
    },
  ],
  WARDEN: [
    {
      label: "Overview",
      items: [
        { label: "Dashboard", href: "/warden", icon: Home },
        { label: "Onboard Tenant", href: "/warden/onboard", icon: UserPlus },
      ],
    },
    {
      label: "Applications",
      items: [
        { label: "Onboards", href: "/warden/onboards", icon: FileText },
        { label: "Leads", href: "/warden/leads", icon: UserSquare },
      ],
    },
    {
      label: "Hostel",
      items: [
        { label: "Occupancy", href: "/warden/occupancy", icon: Map },
        { label: "Food Dashboard", href: "/warden/food", icon: Utensils },
        { label: "Worklists", href: "/warden/worklists", icon: List },
        { label: "Stays", href: "/warden/stays", icon: Bed },
      ],
    },
  ],
  TENANT: [
    {
      items: [
        { label: "My Stay", href: "/tenant", icon: Home },
        { label: "Food Orders", href: "/tenant/food", icon: Utensils },
        { label: "Notifications", href: "/tenant/notifications", icon: Bell },
      ],
    },
  ],
};

const ROLE_LABELS: Record<Role, string> = {
  MAIN_ADMIN: "Admin",
  WARDEN: "Warden",
  TENANT: "Tenant",
};

const ROLE_HOME: Record<Role, string> = {
  MAIN_ADMIN: "/admin",
  WARDEN: "/warden",
  TENANT: "/tenant",
};

const ROLE_COLORS: Record<Role, string> = {
  MAIN_ADMIN: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
  WARDEN: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  TENANT: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
};

// ─── SidebarNavItem ───────────────────────────────────────────────────────────

function SidebarNavItem({
  item,
  collapsed,
  pathname,
  badge,
}: {
  item: NavItem;
  collapsed: boolean;
  pathname: string;
  badge?: number;
}) {
  const Icon = item.icon;
  /**
   * Exact match for root dashboards (/admin, /warden, /tenant),
   * prefix match for everything else — prevents Dashboard from
   * staying "active" on every sub-page.
   */
  const isActive =
    item.href === "/admin" || item.href === "/warden" || item.href === "/tenant"
      ? pathname === item.href
      : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
        )}
      />
      {!collapsed && (
        <span className="flex-1 truncate leading-none">{item.label}</span>
      )}
      {!collapsed && (badge ?? 0) > 0 && (
        <span className="flex h-5 items-center justify-center rounded-full bg-rose-500 px-2 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}

// ─── SidebarContent ───────────────────────────────────────────────────────────

function SidebarContent({
  role,
  userName,
  collapsed,
  onCollapse,
  onClose,
}: {
  role: Role;
  userName: string;
  collapsed: boolean;
  onCollapse?: () => void;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const groups = NAV_CONFIG[role] ?? [];
  const { data: counts = { pendingReviews: 0, pendingPayments: 0, rentDueSoon: 0 } } = useSWR(
    role === "WARDEN" || role === "MAIN_ADMIN" ? "/api/warden/action-counts" : null,
    (url: string) => fetch(url).then(res => res.json()),
    { refreshInterval: 60000, dedupingInterval: 10000 }
  );

  const { data: tenantNotifications } = useSWR(
    role === "TENANT" ? "/api/tenant/notifications" : null,
    (url: string) => fetch(url).then(res => res.json()),
    { refreshInterval: 15000, dedupingInterval: 5000 }
  );
  const unreadCount = tenantNotifications?.notifications?.filter((n: any) => !n.read).length ?? 0;



  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch {
      router.push("/login");
    }
  }, [router]);

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ── */}
      <div
        className={cn(
          "flex items-center border-b px-4 py-4",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        {!collapsed && (
          <Link
            href={ROLE_HOME[role] || "/login"}
            className="flex items-center gap-2.5 min-w-0"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary">
              <span className="text-[11px] font-extrabold text-primary-foreground leading-none">
                NH
              </span>
            </div>
            <span className="text-base font-extrabold tracking-tight truncate">
              Anywhere Node
            </span>
          </Link>
        )}
        {collapsed && (
          <Link href={ROLE_HOME[role] || "/login"}>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <span className="text-[11px] font-extrabold text-primary-foreground leading-none">
                NH
              </span>
            </div>
          </Link>
        )}
        {/* Desktop collapse toggle */}
        {onCollapse && (
          <button
            onClick={onCollapse}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                collapsed && "rotate-180"
              )}
            />
          </button>
        )}
        {/* Mobile close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {groups.map((group, gi) => (
          <div key={gi}>
            {group.label && !collapsed && (
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <SidebarNavItem
                  key={item.href}
                  item={item}
                  collapsed={collapsed}
                  pathname={pathname}
                  badge={
                    item.label === "Onboards" ? counts.pendingReviews + counts.pendingPayments :
                    item.label === "Worklists" ? counts.rentDueSoon :
                    item.label === "Notifications" ? unreadCount : 0
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer ── */}
      <div className={cn("border-t px-3 py-4 space-y-2")}>
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-muted/50">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted-foreground/15 text-muted-foreground">
              <span className="text-[11px] font-bold uppercase leading-none">
                {userName.slice(-2)}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">{userName}</p>
              <span
                className={cn(
                  "mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold",
                  ROLE_COLORS[role]
                )}
              >
                {ROLE_LABELS[role]}
              </span>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          title={collapsed ? "Logout" : undefined}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}

// ─── Main Export: Sidebar ─────────────────────────────────────────────────────

interface SidebarProps {
  role: Role;
  userName: string;
}

export function Sidebar({ role, userName }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile drawer on route change
  const pathname = usePathname();
  useEffect(() => {
    // eslint-disable-next-line
    setMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      {/* ── Mobile Hamburger Button ── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 flex h-9 w-9 items-center justify-center rounded-lg border bg-background shadow-sm lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* ── Mobile Backdrop ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile Drawer ── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r bg-background shadow-xl transition-transform duration-300 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Mobile navigation"
      >
        <SidebarContent
          role={role}
          userName={userName}
          collapsed={false}
          onClose={() => setMobileOpen(false)}
        />
      </aside>

      {/* ── Desktop Sidebar ── */}
      <aside
        className={cn(
          "hidden lg:flex lg:flex-col lg:shrink-0 border-r bg-background transition-all duration-200",
          collapsed ? "lg:w-[60px]" : "lg:w-60"
        )}
        aria-label="Desktop navigation"
      >
        <SidebarContent
          role={role}
          userName={userName}
          collapsed={collapsed}
          onCollapse={() => setCollapsed((c) => !c)}
        />
      </aside>
    </>
  );
}
