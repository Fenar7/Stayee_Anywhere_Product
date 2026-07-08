import { AlertTriangle } from "lucide-react";

interface FoodDueBannerProps {
  balancePaise: number;
  cycleEnd: string;
  billingMode: string;
}

export function FoodDueBanner({ balancePaise, cycleEnd, billingMode }: FoodDueBannerProps) {
  if (balancePaise >= 0) return null;

  const dueAmount = Math.abs(balancePaise) / 100;
  const dueDate = new Date(cycleEnd).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-[24px] p-5 flex items-start gap-4">
      <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
        <AlertTriangle className="w-5 h-5 text-red-500" />
      </div>
      <div>
        <h4 className="text-red-500 font-bold text-[15px] mb-1">Food Bill Overdue</h4>
        <p className="text-red-500/80 text-[13px] leading-relaxed">
          {billingMode === "PREPAID_CONSUMPTION" 
            ? "Your food consumption has exceeded your advance. " 
            : "You have an outstanding food balance for the current cycle. "}
          <strong className="text-red-500"> ₹{dueAmount.toFixed(2)}</strong> is due by {dueDate}. 
          Please top up your wallet to avoid service interruption.
        </p>
      </div>
    </div>
  );
}
