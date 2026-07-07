"use client";

import { useState } from "react";
import { Loader2, Coffee, Sun, Moon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { notify } from "@/lib/toast";

interface FoodOrderPanelProps {
  cutoffStartHour: number; // e.g. 20 (8 PM)
  cutoffEndHour: number;   // e.g. 6 (6 AM)
  activeOrderDay: {
    forDate: string;
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
    isEditable: boolean;
  } | null;
  onOrderUpdated: () => void; // callback to refresh parent data
}

export function FoodOrderPanel({ cutoffStartHour, cutoffEndHour, activeOrderDay, onOrderUpdated }: FoodOrderPanelProps) {
  const [saving, setSaving] = useState<string | null>(null);

  // Determine if window is currently open based on local client time mapped to IST
  const now = new Date();
  // Using simple timezone math for IST (UTC+5:30) for display purposes
  const istTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + (5.5 * 60 * 60 * 1000));
  const currentHour = istTime.getHours();
  
  const isWindowOpen = currentHour >= cutoffStartHour || currentHour < cutoffEndHour;

  const formattedStart = `${cutoffStartHour > 12 ? cutoffStartHour - 12 : cutoffStartHour}:00 ${cutoffStartHour >= 12 ? 'PM' : 'AM'}`;
  const formattedEnd = `${cutoffEndHour > 12 ? cutoffEndHour - 12 : cutoffEndHour}:00 ${cutoffEndHour >= 12 ? 'PM' : 'AM'}`;

  const handleToggle = async (meal: "breakfast" | "lunch" | "dinner", currentValue: boolean) => {
    if (!activeOrderDay || !activeOrderDay.isEditable || !isWindowOpen) return;
    
    setSaving(meal);
    try {
      const res = await fetch("/api/tenant/food-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // We only send the updated toggle. The server enforces the date.
          [meal]: !currentValue,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update order");
      }

      notify.success("Meal preference updated!");
      onOrderUpdated();
    } catch (e: any) {
      notify.error(e.message || "Failed to update");
    } finally {
      setSaving(null);
    }
  };

  if (!isWindowOpen) {
    return (
      <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-[24px] p-6 text-center">
        <Clock className="w-8 h-8 text-amber-500 mx-auto mb-3" />
        <h3 className="text-[16px] font-black text-amber-900 dark:text-amber-500 mb-2">Ordering Window Closed</h3>
        <p className="text-amber-700/80 dark:text-amber-400/80 text-[14px]">
          Food orders are only accepted between <strong>{formattedStart}</strong> and <strong>{formattedEnd}</strong>.
          Please return at {formattedStart} to plan your meals.
        </p>
      </div>
    );
  }

  if (!activeOrderDay) {
    return null;
  }

  const targetDate = new Date(activeOrderDay.forDate);

  return (
    <div className="bg-white dark:bg-[#121212] rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(255,255,255,0.02)] border border-[#f0f0f0] dark:border-white/5 overflow-hidden">
      <div className="p-6 border-b border-[#f0f0f0] dark:border-white/5 bg-[#58ff48]/5">
        <h3 className="text-[16px] font-black text-black dark:text-white flex items-center justify-between">
          <span>Plan Your Meals</span>
          <span className="text-[12px] font-bold text-[#1a8a10] dark:text-[#58ff48] bg-[#58ff48]/10 px-3 py-1 rounded-full uppercase tracking-wider">
            For {targetDate.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
          </span>
        </h3>
        <p className="text-sm text-gray-500 mt-1">Window closes at {formattedEnd}</p>
      </div>

      <div className="p-6 space-y-4">
        {/* Breakfast Toggle */}
        <button
          onClick={() => handleToggle("breakfast", activeOrderDay.breakfast)}
          disabled={!activeOrderDay.isEditable || saving === "breakfast"}
          className={cn(
            "w-full h-14 px-5 rounded-[16px] flex items-center font-bold text-[15px] transition-all border-2",
            activeOrderDay.breakfast 
              ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800" 
              : "bg-gray-50 text-gray-500 dark:bg-white/5 dark:text-gray-400 border-transparent",
            !activeOrderDay.isEditable ? "opacity-60 cursor-not-allowed" : "hover:scale-[1.01]"
          )}
        >
          {saving === "breakfast" ? (
            <Loader2 className="w-5 h-5 mr-3 animate-spin" />
          ) : (
            <Coffee className={cn("w-5 h-5 mr-3", activeOrderDay.breakfast ? "text-amber-600 dark:text-amber-400" : "text-gray-400")} />
          )}
          Breakfast
          {activeOrderDay.breakfast && <span className="ml-auto text-amber-600 dark:text-amber-400">✓</span>}
        </button>

        {/* Lunch Toggle */}
        <button
          onClick={() => handleToggle("lunch", activeOrderDay.lunch)}
          disabled={!activeOrderDay.isEditable || saving === "lunch"}
          className={cn(
            "w-full h-14 px-5 rounded-[16px] flex items-center font-bold text-[15px] transition-all border-2",
            activeOrderDay.lunch 
              ? "bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-800" 
              : "bg-gray-50 text-gray-500 dark:bg-white/5 dark:text-gray-400 border-transparent",
            !activeOrderDay.isEditable ? "opacity-60 cursor-not-allowed" : "hover:scale-[1.01]"
          )}
        >
          {saving === "lunch" ? (
            <Loader2 className="w-5 h-5 mr-3 animate-spin" />
          ) : (
            <Sun className={cn("w-5 h-5 mr-3", activeOrderDay.lunch ? "text-orange-600 dark:text-orange-400" : "text-gray-400")} />
          )}
          Lunch
          {activeOrderDay.lunch && <span className="ml-auto text-orange-600 dark:text-orange-400">✓</span>}
        </button>

        {/* Dinner Toggle */}
        <button
          onClick={() => handleToggle("dinner", activeOrderDay.dinner)}
          disabled={!activeOrderDay.isEditable || saving === "dinner"}
          className={cn(
            "w-full h-14 px-5 rounded-[16px] flex items-center font-bold text-[15px] transition-all border-2",
            activeOrderDay.dinner 
              ? "bg-indigo-100 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800" 
              : "bg-gray-50 text-gray-500 dark:bg-white/5 dark:text-gray-400 border-transparent",
            !activeOrderDay.isEditable ? "opacity-60 cursor-not-allowed" : "hover:scale-[1.01]"
          )}
        >
          {saving === "dinner" ? (
            <Loader2 className="w-5 h-5 mr-3 animate-spin" />
          ) : (
            <Moon className={cn("w-5 h-5 mr-3", activeOrderDay.dinner ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400")} />
          )}
          Dinner
          {activeOrderDay.dinner && <span className="ml-auto text-indigo-600 dark:text-indigo-400">✓</span>}
        </button>

        {!activeOrderDay.isEditable && (
          <p className="text-center text-[12px] font-bold text-gray-400 mt-4">
            Orders for this date are locked.
          </p>
        )}
      </div>
    </div>
  );
}
