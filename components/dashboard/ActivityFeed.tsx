import { AlertTriangle } from "lucide-react";
import Image from "next/image";

export function ActivityFeed() {
  return (
    <div className="rounded-[7px] border border-[#dedede] bg-white dark:bg-zinc-900 p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[16px] font-semibold text-black dark:text-white">Activity</h3>
        <div className="flex gap-2">
          <button className="border border-[#dedede] text-black dark:text-white rounded-[4px] px-3 py-1.5 text-[13px] font-semibold hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
            Filter
          </button>
          <button className="bg-[#282828] text-[#58ff48] rounded-[4px] px-3 py-1.5 text-[13px] font-semibold hover:opacity-90 transition-opacity">
            Know More
          </button>
        </div>
      </div>

      <div className="flex flex-col divide-y divide-[#f2f2f2] dark:divide-zinc-800">
        <div className="py-3.5 first:pt-0 flex flex-col gap-1">
          <h4 className="text-[14px] font-semibold text-[#18b92b] leading-snug">Jhon Doe Has Completed payment</h4>
          <p className="text-[#767676] text-[13px] leading-snug">onboarding @ Jan 5 2026 to Mar 3 2026 | Floor 3 bed 22A</p>
          <p className="text-[#a1a1a1] text-[12px]">Today 3:33 PM</p>
          <div className="text-black dark:text-white text-[13px] font-medium flex items-center gap-1.5 mt-0.5">
            Report an issue <Image src="/icons/alert-black-icon.png" alt="Alert" width={16} height={16} className="size-4" />
          </div>
        </div>

        <div className="py-3.5 flex flex-col gap-1">
          <h4 className="text-[14px] font-semibold text-[#18b92b] leading-snug">Jhon Doe Has Completed payment</h4>
          <p className="text-[#767676] text-[13px] leading-snug">onboarding @ Jan 5 2026 to Mar 3 2026 | Floor 3 bed 22A</p>
          <p className="text-[#a1a1a1] text-[12px]">Today 3:33 PM</p>
          <div className="text-[#e23030] text-[13px] font-medium flex items-center gap-1.5 mt-0.5">
            Reported @ 2:23 AM March 23 2025 <Image src="/icons/alert-red-icon.png" alt="Alert" width={16} height={16} className="size-4" />
          </div>
        </div>

        <div className="py-3.5 flex flex-col gap-1">
          <h4 className="text-[14px] font-semibold text-[#e1a918] leading-snug">Alan has started filling the form</h4>
          <p className="text-[#767676] text-[13px] leading-snug">User registered today has started filling the form now</p>
          <p className="text-[#a1a1a1] text-[12px]">Today 3:33 PM</p>
        </div>

        <div className="py-3.5 flex flex-col gap-1">
          <h4 className="text-[14px] font-semibold text-[#285bc7] leading-snug">Sarah has submitted the details</h4>
          <p className="text-[#767676] text-[13px] leading-snug">Sarah has submitted the details and is waiting for payment link</p>
          <p className="text-[#a1a1a1] text-[12px]">Today 3:33 PM</p>
        </div>

        <div className="py-3.5 pb-0 flex flex-col gap-1">
          <h4 className="text-[14px] font-semibold text-[#e23030] leading-snug">Sam has registered a complaint</h4>
          <p className="text-[#767676] text-[13px] leading-snug">Sam has registered a new complaint about the facilities</p>
          <p className="text-[#a1a1a1] text-[12px]">Today 3:33 PM</p>
        </div>
      </div>
    </div>
  );
}
