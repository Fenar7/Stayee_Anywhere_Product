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
  Activity,
  ChevronLeft,
  Menu,
  LogOut,
  X,
  UserPlus,
  Bed,
  Bell,
  Search,
  ChevronDown,
  HelpCircle,
  Settings,
  ArrowLeft,
  LayoutGrid,
  AlertCircle,
  ClipboardList
} from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

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
      items: [
        { label: "Dashboard", href: "/admin", icon: LayoutGrid },
        { label: "Hostels", href: "/admin/hostels", icon: Building2 },
        { label: "All Users", href: "/admin/users", icon: Users },
        { label: "Wardens", href: "/admin/wardens", icon: Shield },
        { label: "Tasks", href: "/admin/tasks", icon: ClipboardList },
        { label: "Complaints", href: "/admin/tickets", icon: AlertCircle },
      ],
    },
    {
      items: [
        { label: "Onboards", href: "/admin/onboards", icon: FileText },
        { label: "Leads", href: "/admin/leads", icon: UserSquare },
      ],
    },
    {
      items: [
        { label: "Food Dashboard", href: "/warden/food", icon: Utensils },
        { label: "Occupancy", href: "/warden/occupancy", icon: Map },
        { label: "Worklists", href: "/warden/worklists", icon: List },
        { label: "Notifications", href: "/admin/notifications", icon: Bell },
        { label: "Activity Log", href: "/admin/activity", icon: Activity },
      ],
    },
  ],
  WARDEN: [
    {
      items: [
        { label: "Dashboard", href: "/warden", icon: LayoutGrid },
        { label: "Beds", href: "/warden/occupancy", icon: Bed },
        { label: "Bookings", href: "/warden/onboards", icon: FileText },
        { label: "Tenants", href: "/warden/stays", icon: Users },
        { label: "Tasks", href: "/warden/tasks", icon: ClipboardList },
        { label: "Complaints", href: "/warden/tickets", icon: AlertCircle },
        { label: "Incidents", href: "/warden/worklists", icon: Shield }, // Placeholder
        { label: "House Keeping", href: "/warden/food", icon: Utensils }, // Placeholder
        { label: "Notifications", href: "/warden/notifications", icon: Bell }, 
        { label: "Activity Log", href: "/warden/activity", icon: Activity },
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
  const isActive =
    item.href === "/admin" || item.href === "/warden" || item.href === "/tenant"
      ? pathname === item.href
      : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group flex items-center gap-3 px-3 py-[11px] text-[14px] font-medium transition-all duration-150 rounded-[7px]",
        isActive
          ? "border border-[#dedede] text-black shadow-sm bg-white font-semibold"
          : "text-black border border-transparent hover:bg-gray-50"
      )}
    >
      <Icon
        className={cn(
          "h-5 w-5 shrink-0 transition-colors",
          isActive ? "text-black" : "text-black group-hover:text-black"
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
  const { data: counts = { pendingReviews: 0, pendingPayments: 0, rentDueSoon: 0, openTickets: 0, unreadNotifications: 0, pendingTasks: 0 } } = useSWR(
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
    <div className="flex h-full flex-col bg-white">
      {/* ── Header ── */}
      <div
        className={cn(
          "flex pt-8 pb-6",
          collapsed ? "flex-col items-center gap-4 px-2" : "flex-row items-center justify-between px-5"
        )}
      >
        {!collapsed && (
          <Link
            href={ROLE_HOME[role] || "/login"}
            className="flex items-center gap-3 min-w-0"
          >
            <Image
              src="/anywhere-node-squre-icon.png"
              alt="Anywhere Node Logo"
              width={48}
              height={48}
              className="rounded-[10px] shrink-0"
            />
            <div className="flex items-center gap-1">
              <span className="text-[17px] font-semibold text-black tracking-tight truncate">
                Anywhere Node
              </span>
              <ChevronDown className="size-4 text-black" />
            </div>
          </Link>
        )}
        {collapsed && (
          <Link href={ROLE_HOME[role] || "/login"}>
            <Image
              src="/anywhere-node-squre-icon.png"
              alt="Anywhere Node Logo"
              width={48}
              height={48}
              className="rounded-[10px] shrink-0"
            />
          </Link>
        )}
        {/* Desktop collapse toggle */}
        {onCollapse && !collapsed && (
          <button
            onClick={onCollapse}
            className="rounded-[6px] border border-[#dedede] p-2 hover:bg-gray-50 transition-colors shrink-0"
            title="Collapse sidebar"
          >
            <ArrowLeft className="h-5 w-5 text-black" />
          </button>
        )}
        {onCollapse && collapsed && (
          <button
            onClick={onCollapse}
            className="rounded-[6px] border border-[#dedede] p-2 hover:bg-gray-50 transition-colors shrink-0"
            title="Expand sidebar"
          >
            <ChevronLeft className="h-5 w-5 text-black rotate-180" />
          </button>
        )}
        {/* Mobile close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-[6px] border border-[#dedede] p-2 hover:bg-gray-50 transition-colors shrink-0"
          >
            <X className="h-5 w-5 text-black" />
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="px-5 pb-6">
          <div className="flex items-center gap-2 border border-[#dedede] rounded-[7px] px-3 h-11 w-full bg-white">
            <Search className="size-5 text-[#767676]" />
            <input 
              type="text" 
              placeholder="Search." 
              className="flex-1 bg-transparent border-none outline-none text-[15px] placeholder:text-[#767676] text-black"
            />
          </div>
        </div>
      )}

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto px-5 space-y-1 pb-4">
        {groups.map((group, gi) => (
          <div key={gi}>
            {group.label && !collapsed && (
              <p className="mb-2 px-4 text-[12px] font-semibold uppercase tracking-widest text-[#767676] mt-4">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => (
                <SidebarNavItem
                  key={item.href}
                  item={item}
                  collapsed={collapsed}
                  pathname={pathname}
                  badge={
                    item.label === "Onboards" ? counts.pendingReviews + counts.pendingPayments :
                    item.label === "Worklists" ? counts.rentDueSoon :
                    item.label === "Complaints" ? counts.openTickets :
                    item.label === "Tasks" ? counts.pendingTasks :
                    item.label === "Notifications" ? (role === "TENANT" ? unreadCount : counts.unreadNotifications) : 0
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer ── */}
      <div className="px-5 pb-8 space-y-6">
        <div className="flex flex-col gap-4 px-2">
          <button className="flex items-center text-black hover:opacity-70 transition-opacity">
            <HelpCircle className="size-[28px]" />
          </button>
          <button className="flex items-center text-black hover:opacity-70 transition-opacity">
            <Settings className="size-[28px]" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="size-12 shrink-0 rounded-full bg-gray-200 overflow-hidden">
             {/* Fallback to initials if no image is available */}
            <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-600 font-bold">
              {userName.slice(0, 2).toUpperCase()}
            </div>
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1 flex flex-col justify-center">
              <p className="truncate text-[16px] font-semibold text-black leading-tight">Next Home Calicut</p>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-[14px] text-[#767676] hover:text-black transition-colors mt-0.5"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
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

  const pathname = usePathname();
  useEffect(() => {
    // eslint-disable-next-line
    setMobileOpen(false);
  }, [pathname]);

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
        className="fixed left-4 top-4 z-40 flex h-9 w-9 items-center justify-center rounded-lg border bg-white shadow-sm lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-4 w-4 text-black" />
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
          "fixed inset-y-0 left-0 z-50 w-72 border-r border-[#dedede] bg-white shadow-xl transition-transform duration-300 lg:hidden",
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
          "hidden lg:flex lg:flex-col lg:shrink-0 bg-white border-r border-[#dedede] transition-all duration-200",
          collapsed ? "lg:w-[90px]" : "lg:w-72"
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
