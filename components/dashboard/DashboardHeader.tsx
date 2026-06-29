import { Bell, Plus } from "lucide-react";

export function DashboardHeader() {
  const dateStr = new Intl.DateTimeFormat('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(new Date());

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-[#dedede] dark:border-white/10">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight text-black dark:text-white flex items-center gap-2">
          Dashboard
        </h1>
        <p className="text-[#767676] text-[13px] font-medium mt-1 uppercase tracking-wider">{dateStr}</p>
      </div>
      <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
        <button className="flex items-center justify-center size-10 premium-button-outline shrink-0">
          <Bell className="size-5 text-black dark:text-white" />
        </button>
        <button className="flex items-center justify-center gap-2 premium-button-outline whitespace-nowrap">
          Manage Rent <Plus className="size-4 text-[#58ff48]" />
        </button>
        <button className="flex items-center justify-center gap-2 premium-button whitespace-nowrap">
          On Board a User <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}
