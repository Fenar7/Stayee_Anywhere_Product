import { LucideIcon, ArrowUpRight, ArrowDownRight } from "lucide-react";
import Image from "next/image";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon?: LucideIcon;
  iconUrl?: string;
  trend: string;
  trendUp?: boolean;
}

export function StatCard({ title, value, subtitle, icon: Icon, iconUrl, trend, trendUp }: StatCardProps) {
  return (
    <div className="rounded-[7px] border border-[#dedede] bg-white dark:bg-zinc-900 flex flex-col justify-between p-5 gap-5">
      {/* Top row: title + icon */}
      <div className="flex justify-between items-start">
        <h3 className="text-[15px] font-semibold text-black dark:text-white leading-snug">{title}</h3>
        <div className="size-12 rounded-[6px] bg-[#5c5c5c] flex items-center justify-center shrink-0">
          {iconUrl ? (
            <Image src={iconUrl} alt={title} width={24} height={24} className="size-6 object-contain" />
          ) : Icon ? (
            <Icon className="size-6 text-[#58ff48]" />
          ) : null}
        </div>
      </div>

      {/* Bottom row: value + trend */}
      <div className="flex justify-between items-end">
        <div>
          <div className="text-[30px] font-bold text-black dark:text-white leading-none">{value}</div>
          <div className="text-[13px] text-[#767676] mt-1">{subtitle}</div>
        </div>
        <div className="text-[13px] text-[#767676] flex flex-col items-end gap-0.5">
          {trendUp !== undefined && (
            trendUp
              ? <ArrowUpRight className="size-5 text-black dark:text-white" />
              : <ArrowDownRight className="size-5 text-black dark:text-white" />
          )}
          <span>{trend}</span>
        </div>
      </div>
    </div>
  );
}
