import { Coffee, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreakdownDay {
  forDate: string;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  dailyTotalPaise: number;
}

interface FoodDailyBreakdownProps {
  days: BreakdownDay[];
}

export function FoodDailyBreakdown({ days }: FoodDailyBreakdownProps) {
  if (days.length === 0) return null;

  return (
    <div className="bg-white dark:bg-[#121212] rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(255,255,255,0.02)] border border-[#f0f0f0] dark:border-white/5 overflow-hidden">
      <div className="p-6 border-b border-[#f0f0f0] dark:border-white/5">
        <h3 className="text-[16px] font-black text-black dark:text-white">Daily Breakdown</h3>
      </div>
      
      <div className="divide-y divide-[#f0f0f0] dark:divide-white/5">
        {days.map((day) => {
          const date = new Date(day.forDate);
          
          // Skip days with no meals to keep the ledger clean
          if (!day.breakfast && !day.lunch && !day.dinner) return null;

          return (
            <div key={day.forDate} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
              <div>
                <p className="text-[14px] font-bold text-black dark:text-white">
                  {date.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <div className={cn(
                    "flex items-center gap-1 text-[12px] font-bold",
                    day.breakfast ? "text-amber-600 dark:text-amber-400" : "text-gray-300 dark:text-white/10"
                  )}>
                    <Coffee className="w-3.5 h-3.5" /> B
                  </div>
                  <div className={cn(
                    "flex items-center gap-1 text-[12px] font-bold",
                    day.lunch ? "text-orange-600 dark:text-orange-400" : "text-gray-300 dark:text-white/10"
                  )}>
                    <Sun className="w-3.5 h-3.5" /> L
                  </div>
                  <div className={cn(
                    "flex items-center gap-1 text-[12px] font-bold",
                    day.dinner ? "text-indigo-600 dark:text-indigo-400" : "text-gray-300 dark:text-white/10"
                  )}>
                    <Moon className="w-3.5 h-3.5" /> D
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[15px] font-black text-black dark:text-white">
                  ₹{(day.dailyTotalPaise / 100).toFixed(2)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
