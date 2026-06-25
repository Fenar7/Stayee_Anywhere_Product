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
    <div className="border-b border-border">
      <nav className="flex space-x-2 overflow-x-auto pb-px" aria-label="Tabs">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "whitespace-nowrap flex items-center px-4 py-2 border-b-2 font-medium text-sm transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <item.icon className={cn("mr-2 h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
