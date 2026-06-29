import { AlertTriangle } from "lucide-react";
import Image from "next/image";

export function ActivityFeed() {
  return (
    <div className="premium-card p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[14px] font-bold text-black dark:text-white uppercase tracking-wider">Activity</h3>
        <div className="flex gap-3">
          <button className="text-[12px] font-semibold text-[#767676] hover:text-black dark:hover:text-white transition-colors uppercase tracking-wider">
            Filter
          </button>
          <button className="text-[12px] font-semibold text-[#767676] hover:text-[#58ff48] transition-colors uppercase tracking-wider flex items-center gap-1">
            View All <span className="text-[14px]">→</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col divide-y divide-[#dedede] dark:divide-white/10 flex-1">
        <div className="py-4 first:pt-0 flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-[#58ff48]"></span>
            <h4 className="text-[13px] font-bold text-black dark:text-white tracking-tight">Jhon Doe Has Completed payment</h4>
          </div>
          <p className="text-[#767676] text-[13px] leading-snug font-medium pl-3.5">onboarding @ Jan 5 2026 to Mar 3 2026 | Floor 3 bed 22A</p>
          <div className="flex items-center justify-between pl-3.5 mt-1">
            <p className="text-[#a1a1a1] text-[12px] font-medium uppercase tracking-wider">Today 3:33 PM</p>
            <span className="text-[#767676] text-[11px] font-bold uppercase tracking-wider border border-[#dedede] dark:border-white/10 px-2 py-0.5 rounded-sm">Report Issue</span>
          </div>
        </div>

        <div className="py-4 flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-[#58ff48]"></span>
            <h4 className="text-[13px] font-bold text-black dark:text-white tracking-tight">Jhon Doe Has Completed payment</h4>
          </div>
          <p className="text-[#767676] text-[13px] leading-snug font-medium pl-3.5">onboarding @ Jan 5 2026 to Mar 3 2026 | Floor 3 bed 22A</p>
          <div className="flex items-center justify-between pl-3.5 mt-1">
            <p className="text-[#a1a1a1] text-[12px] font-medium uppercase tracking-wider">Today 3:33 PM</p>
            <span className="text-red-500 text-[11px] font-bold uppercase tracking-wider border border-red-500/20 px-2 py-0.5 rounded-sm flex items-center gap-1">
              <AlertTriangle className="size-3" /> Reported
            </span>
          </div>
        </div>

        <div className="py-4 flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-blue-500"></span>
            <h4 className="text-[13px] font-bold text-black dark:text-white tracking-tight">Alan has started filling the form</h4>
          </div>
          <p className="text-[#767676] text-[13px] leading-snug font-medium pl-3.5">User registered today has started filling the form now</p>
          <p className="text-[#a1a1a1] text-[12px] font-medium uppercase tracking-wider pl-3.5 mt-1">Today 3:33 PM</p>
        </div>

        <div className="py-4 flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-blue-500"></span>
            <h4 className="text-[13px] font-bold text-black dark:text-white tracking-tight">Sarah has submitted the details</h4>
          </div>
          <p className="text-[#767676] text-[13px] leading-snug font-medium pl-3.5">Sarah has submitted the details and is waiting for payment link</p>
          <p className="text-[#a1a1a1] text-[12px] font-medium uppercase tracking-wider pl-3.5 mt-1">Today 3:33 PM</p>
        </div>

        <div className="py-4 pb-0 flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-red-500"></span>
            <h4 className="text-[13px] font-bold text-black dark:text-white tracking-tight">Sam has registered a complaint</h4>
          </div>
          <p className="text-[#767676] text-[13px] leading-snug font-medium pl-3.5">Sam has registered a new complaint about the facilities</p>
          <p className="text-[#a1a1a1] text-[12px] font-medium uppercase tracking-wider pl-3.5 mt-1">Today 3:33 PM</p>
        </div>
      </div>
    </div>
  );
}

