import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatusItem {
  id: string;
  label: string;
  value: string | number;
  icon?: LucideIcon;
  iconColor?: string;
}

interface StatusListCardProps {
  title: string;
  items: StatusItem[];
}

export function StatusListCard({ title, items }: StatusListCardProps) {
  return (
    <div className="rounded-[7px] border border-[#dedede] bg-white dark:bg-zinc-900 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] font-semibold text-black dark:text-white">{title}</h3>
        <button className="bg-[#282828] text-[#58ff48] rounded-[4px] px-3 py-1 text-[11px] font-semibold hover:opacity-90 transition-opacity">
          Know More
        </button>
      </div>
      <div className="flex flex-col divide-y divide-[#f2f2f2] dark:divide-zinc-800">
        {items.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={item.id || idx} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
              <div className="flex items-center gap-2 min-w-0">
                {Icon && <Icon className={cn("size-4 shrink-0", item.iconColor)} />}
                <span className="text-[12px] text-[#767676] truncate">{item.label}</span>
              </div>
              <span className="text-[12px] font-semibold text-black dark:text-white ml-2 shrink-0">{item.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
