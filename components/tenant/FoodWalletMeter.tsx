import { cn } from "@/lib/utils";

interface FoodWalletMeterProps {
  paidPaise: number;
  consumedPaise: number;
}

export function FoodWalletMeter({ paidPaise, consumedPaise }: FoodWalletMeterProps) {
  const balancePaise = paidPaise - consumedPaise;
  const isDebt = balancePaise < 0;
  
  // Calculate percentage for the progress bar.
  // If paid is 0 (e.g. pure postpaid), cap at 100%.
  // If consumed > paid, the bar is completely filled (and turns red).
  const percentage = paidPaise === 0 
    ? (consumedPaise > 0 ? 100 : 0)
    : Math.min((consumedPaise / paidPaise) * 100, 100);

  return (
    <div className="bg-white dark:bg-[#121212] rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(255,255,255,0.02)] border border-[#f0f0f0] dark:border-white/5 p-6">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-1">Food Wallet</h3>
          <p className="text-2xl font-black text-black dark:text-white">
            ₹{(consumedPaise / 100).toFixed(2)}
            <span className="text-[15px] text-gray-500 font-medium ml-1">
              / ₹{(paidPaise / 100).toFixed(2)}
            </span>
          </p>
        </div>
        <div className="text-right">
          <p className={cn(
            "text-lg font-bold",
            isDebt ? "text-red-500" : "text-[#58ff48]"
          )}>
            {isDebt ? "-" : "+"}₹{(Math.abs(balancePaise) / 100).toFixed(2)}
          </p>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            {isDebt ? "Due" : "Remaining"}
          </p>
        </div>
      </div>

      <div className="h-3 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isDebt ? "bg-red-500" : "bg-[#58ff48]"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
