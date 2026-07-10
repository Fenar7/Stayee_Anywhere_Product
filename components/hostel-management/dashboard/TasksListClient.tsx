"use client";

import Link from "next/link";
import { ReactNode } from "react";

export function TasksListClient({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[7px] border border-[#dedede] bg-white dark:bg-zinc-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[16px] font-semibold text-black dark:text-white">Tasks</h3>
        <Link 
          href="/warden/tasks"
          className="bg-[#282828] text-[#58ff48] rounded-[4px] px-3 py-1.5 text-[13px] font-semibold hover:opacity-90 transition-opacity flex items-center justify-center"
        >
          View All
        </Link>
      </div>

      <div className="flex flex-col divide-y divide-[#f2f2f2] dark:divide-zinc-800">
        {children}
      </div>
    </div>
  );
}
