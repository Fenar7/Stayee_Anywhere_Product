"use client";

import { Bell, Plus } from "lucide-react";
import useSWR from "swr";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
    "/api/warden/action-counts",
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
          <DropdownMenuContent align="end" className="w-64 p-2 bg-white rounded-xl shadow-lg border border-gray-100 mt-2">
            <div className="px-2 pt-1 pb-2 font-semibold text-gray-900 text-sm">Notifications</div>
            <div className="h-px bg-gray-100 my-1 mx-2" />
            <DropdownMenuItem className="py-3 text-sm text-gray-500 text-center flex justify-center hover:bg-transparent cursor-default">
              {counts.unreadNotifications > 0 ? (
                <Link href={`${rolePrefix}/notifications`} className="hover:underline text-primary">
                  You have {counts.unreadNotifications} unread notification(s). View them in the Notifications panel.
                </Link>
              ) : (
                "No new notifications right now."
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <button className="flex items-center justify-center h-10 px-5 border border-[#dedede] rounded-[6px] bg-white text-black text-[15px] font-semibold hover:bg-gray-50 transition-colors whitespace-nowrap">
          Manage Rent <Plus className="ml-1.5 size-4 text-[#58ff48]" />
        </button>
        <button className="flex items-center justify-center h-10 px-5 rounded-[6px] bg-[#282828] text-white text-[15px] font-semibold hover:bg-black transition-colors whitespace-nowrap">
          On Board a User <Plus className="ml-1.5 size-4 text-[#58ff48]" />
        </button>
      </div>
    </div>
  );
}
