"use client";

import { Bell } from "lucide-react";
import useSWR from "swr";
import Link from "next/link";
import { UserRole } from "@prisma/client";

export function NotificationBellClient({ role, baseRoute }: { role: UserRole, baseRoute: string }) {
  const { data: counts } = useSWR(
    role === "WARDEN" || role === "MAIN_ADMIN" ? "/api/warden/action-counts" : "/api/tenant/notifications",
    (url: string) => fetch(url).then(res => res.json()),
    { refreshInterval: 60000, dedupingInterval: 10000 }
  );

  const unreadCount = role === "TENANT" ? (counts?.unreadCount || 0) : (counts?.unreadNotifications || 0);

  return (
    <Link 
      href={`${baseRoute}/notifications`}
      className="relative flex items-center justify-center size-10 rounded-[6px] border border-[#dedede] dark:border-white/10 bg-white dark:bg-[#1a1a1a] text-black dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-all shrink-0"
    >
      <Bell className="size-[18px]" />
      {unreadCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full border-2 border-white dark:border-black">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
