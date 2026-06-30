"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building,
  Bed,
  Users,
  Utensils,
  CreditCard,
  UserPlus,
  ClipboardList
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

export default function AdminHostelNav({ hostelId }: { hostelId: string }) {
  const pathname = usePathname();
  const basePath = `/admin/hostels/${hostelId}`;

  const navItems: NavItem[] = [
    { name: "Overview", href: basePath, icon: LayoutDashboard },
    { name: "Tenants", href: `${basePath}/stays`, icon: Users },
    { name: "Leads", href: `${basePath}/leads`, icon: ClipboardList },
    { name: "Food", href: `${basePath}/food`, icon: Utensils },
    { name: "Occupancy", href: `${basePath}/occupancy`, icon: Bed },
    { name: "Builder", href: `${basePath}/builder`, icon: Building },
    { name: "Onboard", href: `${basePath}/onboard`, icon: UserPlus },
    { name: "Payments", href: `${basePath}/worklists`, icon: CreditCard },
  ];

  return (
    <nav className="premium-tab-list" aria-label="Tabs">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "premium-tab flex items-center",
              isActive && "active"
            )}
          >
            <item.icon className={cn("mr-2 size-4", isActive ? "text-[#58ff48]" : "text-[#767676]")} />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}
