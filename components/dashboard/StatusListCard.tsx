import { LucideIcon } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface StatusItem {
  id: string;
  label: string;
  value: string | number;
  icon?: LucideIcon;
  iconUrl?: string;
  iconColor?: string;
}

interface StatusListCardProps {
  title: string;
  items: StatusItem[];
}

export function StatusListCard({ title, items }: StatusListCardProps) {
  return (
    <div className="rounded-[7px] border border-[#dedede] bg-white dark:bg-zinc-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[16px] font-semibold text-black dark:text-white">{title}</h3>
        <button className="bg-[#282828] text-[#58ff48] rounded-[4px] px-3 py-1.5 text-[13px] font-semibold hover:opacity-90 transition-opacity whitespace-nowrap">
          Know More
        </button>
      </div>
      <div className="flex flex-col divide-y divide-[#f2f2f2] dark:divide-zinc-800">
        {items.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={item.id || idx} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3 min-w-0">
                {item.iconUrl ? (
                  <Image src={item.iconUrl} alt={item.label} width={20} height={20} className="size-5 shrink-0" />
                ) : Icon ? (
                  <Icon className={cn("size-5 shrink-0", item.iconColor)} />
                ) : null}
                <span className="text-[14px] text-[#767676] truncate">{item.label}</span>
              </div>
              <span className="text-[14px] font-semibold text-black dark:text-white ml-3 shrink-0">{item.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
