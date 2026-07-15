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
    <nav className="flex items-center gap-2 w-full overflow-x-auto scrollbar-none py-3" aria-label="Tabs">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center px-4 py-2 text-[14px] font-medium rounded-full transition-all whitespace-nowrap border",
              isActive 
                ? "bg-[#222222] text-white border-transparent shadow-sm dark:bg-[#58ff48] dark:text-black" 
                : "bg-transparent text-[#767676] border-[#dedede] hover:text-[#222222] hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5 dark:text-gray-400 dark:hover:text-white"
            )}
          >
            <item.icon className={cn("mr-2 size-[15px]", isActive ? "text-[#58ff48] dark:text-black" : "text-[#767676] dark:text-gray-400")} />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}
