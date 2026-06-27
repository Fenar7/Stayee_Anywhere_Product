import { LucideIcon, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  trend: string;
  trendUp?: boolean;
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, trendUp }: StatCardProps) {
  return (
    <div className="rounded-[7px] border border-[#dedede] bg-white dark:bg-zinc-900 flex flex-col justify-between p-4 min-h-[120px]">
      <div className="flex justify-between items-start">
        <h3 className="text-[13px] font-semibold text-black dark:text-white leading-tight">{title}</h3>
        <div className="size-9 rounded-[6px] bg-[#5c5c5c] flex items-center justify-center shrink-0">
          <Icon className="size-[18px] text-[#58ff48]" />
        </div>
      </div>

      <div className="flex justify-between items-end mt-3">
        <div>
          <div className="text-[22px] font-bold text-black dark:text-white leading-none">{value}</div>
          <div className="text-[11px] text-[#767676] mt-0.5">{subtitle}</div>
        </div>
        <div className="text-[11px] text-[#767676] flex flex-col items-end gap-0.5">
          {trendUp !== undefined && (
            trendUp
              ? <ArrowUpRight className="size-4 text-black dark:text-white" />
              : <ArrowDownRight className="size-4 text-black dark:text-white" />
          )}
          <span>{trend}</span>
        </div>
      </div>
    </div>
  );
}
