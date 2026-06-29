import { Bell, Plus } from "lucide-react";

export function DashboardHeader() {
  const dateStr = new Intl.DateTimeFormat('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(new Date());

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between pb-2">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-black dark:text-white flex items-center gap-2">
          Dashboard <span className="text-[24px]">👋</span>
        </h1>
        <p className="text-[#767676] text-[14px] font-medium mt-0.5">{dateStr}</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
        <button className="flex items-center justify-center size-10 border border-[#dedede] rounded-[6px] hover:bg-gray-50 transition-colors shrink-0">
          <Bell className="size-5 text-[#5c5c5c]" />
        </button>
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
