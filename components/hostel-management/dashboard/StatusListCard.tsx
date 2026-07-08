import { LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface StatusItem {
  id: string;
  label: string;
  value: string | number;
  icon?: LucideIcon;
  iconUrl?: string;
  iconColor?: string;
  href?: string;
}

interface StatusListCardProps {
  title: string;
  items: StatusItem[];
}

export function StatusListCard({ title, items }: StatusListCardProps) {
  return (
    <div className="premium-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[14px] font-bold text-black dark:text-white uppercase tracking-wider">{title}</h3>
        <button className="text-[12px] font-semibold text-[#767676] hover:text-[#58ff48] transition-colors uppercase tracking-wider flex items-center gap-1">
          View All <span className="text-[14px]">→</span>
        </button>
      </div>
      <div className="flex flex-col divide-y divide-[#dedede] dark:divide-white/10">
        {items.map((item, idx) => {
          const Icon = item.icon;
          const content = (
            <div className="flex items-center gap-3 min-w-0">
              {item.iconUrl ? (
                <Image src={item.iconUrl} alt={item.label} width={20} height={20} className="size-4 shrink-0 opacity-70 dark:opacity-50 grayscale" />
              ) : Icon ? (
                <Icon className={cn("size-4 shrink-0 text-[#767676] dark:text-[#a0a0a0]", item.iconColor)} />
              ) : null}
              <span className="text-[13px] font-medium text-[#767676] dark:text-[#a0a0a0] truncate group-hover:text-black dark:group-hover:text-white transition-colors">{item.label}</span>
            </div>
          );

          const valueElement = (
            <span className="text-[15px] font-bold text-black dark:text-white ml-3 shrink-0 tracking-tight">{item.value}</span>
          );

          if (item.href) {
            return (
              <Link href={item.href} key={item.id || idx} className="group flex items-center justify-between py-4 first:pt-0 last:pb-0 hover:bg-black/5 dark:hover:bg-white/5 -mx-4 px-4 rounded-md transition-colors">
                {content}
                {valueElement}
              </Link>
            );
          }

          return (
            <div key={item.id || idx} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
              {content}
              {valueElement}
            </div>
          );
        })}
      </div>
    </div>
  );
}

