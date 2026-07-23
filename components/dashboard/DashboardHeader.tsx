"use client";

import { Bell, Plus } from "lucide-react";
import useSWR from "swr";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function DashboardHeader() {
  const pathname = usePathname();
  const rolePrefix = pathname.startsWith("/admin") 
    ? "/admin" 
    : pathname.startsWith("/warden") 
      ? "/warden" 
      : "/tenant";

  const dateStr = new Intl.DateTimeFormat('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(new Date());

  const { data: counts = { unreadNotifications: 0 } } = useSWR(
    pathname.startsWith("/admin") ? null : "/api/warden/action-counts",
    (url: string) => fetch(url).then(res => res.json()),
    { refreshInterval: 60000, dedupingInterval: 10000 }
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between pb-2">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-black dark:text-white flex items-center gap-2">
          Dashboard <span className="text-[24px]">👋</span>
        </h1>
        <p className="text-[#767676] text-[14px] font-medium mt-0.5">{dateStr}</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
        <DropdownMenu>
          <DropdownMenuTrigger className="relative flex items-center justify-center size-10 border border-[#dedede] rounded-[6px] hover:bg-gray-50 transition-colors shrink-0 outline-none">
            <Bell className="size-5 text-[#5c5c5c]" />
            {counts.unreadNotifications > 0 && (
              <span className="absolute top-2 right-2 size-2 bg-rose-500 rounded-full" />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 p-3 bg-white dark:bg-[#121212] rounded-2xl shadow-xl border border-gray-100 dark:border-white/10 mt-2 space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="font-bold text-black dark:text-white text-xs uppercase tracking-wider">
                Notifications
              </span>
              <Link
                href={`${rolePrefix}/notifications`}
                className="text-xs font-semibold text-emerald-600 dark:text-[#58ff48] hover:underline flex items-center gap-0.5"
              >
                View All ↗
              </Link>
            </div>
            <div className="h-px bg-gray-100 dark:bg-white/10" />
            <div className="py-2 text-xs text-gray-500 text-center">
              {counts.unreadNotifications > 0 ? (
                <Link href={`${rolePrefix}/notifications`} className="hover:underline text-black dark:text-white font-medium">
                  You have <span className="font-bold text-rose-500">{counts.unreadNotifications}</span> unread notification(s).
                </Link>
              ) : (
                <span className="text-gray-400">No new notifications right now.</span>
              )}
            </div>
            <div className="pt-1">
              <Link
                href={`${rolePrefix}/notifications`}
                className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl bg-gray-100 dark:bg-white/10 text-center text-xs font-bold text-black dark:text-white hover:bg-gray-200 dark:hover:bg-white/20 transition-all"
              >
                <span>Open Notifications Center</span> ↗
              </Link>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        <Link
          href={`${rolePrefix}/worklists`}
          className="flex items-center justify-center h-10 px-5 border border-[#dedede] rounded-[6px] bg-white text-black text-[15px] font-semibold hover:bg-gray-50 transition-colors whitespace-nowrap"
        >
          Manage Rent <Plus className="ml-1.5 size-4 text-[#58ff48]" />
        </Link>
        <Link
          href={rolePrefix === "/admin" ? "/admin/onboard" : "/warden/onboard"}
          className="flex items-center justify-center h-10 px-5 rounded-[6px] bg-[#282828] text-white text-[15px] font-semibold hover:bg-black transition-colors whitespace-nowrap"
        >
          On Board a User <Plus className="ml-1.5 size-4 text-[#58ff48]" />
        </Link>
      </div>
    </div>
  );
}
