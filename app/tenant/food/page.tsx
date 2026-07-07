"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2, ChevronLeft, ChevronRight,
  Coffee, Sun, Moon, CalendarDays, Lock, UtensilsCrossed,
  Home, Wallet, User as UserIcon, Utensils
} from "lucide-react";
import Link from "next/link";
import { notify } from "@/lib/toast";
import { DashboardSkeleton } from "@/components/shared/DashboardSkeleton";
import { FoodWalletMeter } from "@/components/tenant/FoodWalletMeter";
import { FoodDueBanner } from "@/components/tenant/FoodDueBanner";
import { FoodDailyBreakdown } from "@/components/tenant/FoodDailyBreakdown";
import { FoodOrderPanel } from "@/components/tenant/FoodOrderPanel";
import { FoodTopUpModal } from "@/components/tenant/FoodTopUpModal";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface FoodOrderDay {
  forDate: string;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  isEditable: boolean;
  confirmedAt: string | null;
  lockedAt: string | null;
}

interface FoodOrdersResponse {
  stayId: string;
  foodPlan: string;
  cutoffStartHour: number;
  cutoffEndHour: number;
  days: FoodOrderDay[];
}

interface FoodLedgerResponse {
  stay: {
    id: string;
    foodBillingMode: string;
    foodPlan: string;
  };
  currentCycle: {
    id: string;
    cycleStart: string;
    cycleEnd: string;
  } | null;
  walletBalance: {
    totalPaidPaise: number;
    totalConsumedPaise: number;
    balancePaise: number;
  } | null;
  dailyBreakdown: {
    forDate: string;
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
    dailyTotalPaise: number;
  }[];
  settlementHistory: any[];
}

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function getISTDate(): Date {
  const now = new Date();
  return new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
}

function formatDateShort(istDate: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${istDate.getUTCDate()} ${months[istDate.getUTCMonth()]} ${istDate.getUTCFullYear()}`;
}

function getMonday(istDate: Date): Date {
  const d = new Date(istDate.getTime());
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  d.setUTCDate(diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function addDays(istDate: Date, days: number): Date {
  const d = new Date(istDate.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function toISODate(istDate: Date): string {
  const y = istDate.getUTCFullYear();
  const m = String(istDate.getUTCMonth() + 1).padStart(2, "0");
  const d = String(istDate.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ─── Micro-Components (Consumer/Fintech Style) ───────────────────────────────

function SoftCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-[#121212] rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(255,255,255,0.02)] border border-[#f0f0f0] dark:border-white/5 p-6 ${className}`}>
      {children}
    </div>
  );
}

function PillButton({ children, onClick, variant = "primary", className = "", type = "button", disabled = false }: any) {
  const base = "h-14 px-8 rounded-full font-bold text-[15px] flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]";
  const variants = {
    primary: "bg-[#111111] dark:bg-[#58ff48] text-white dark:text-black hover:bg-black/90",
    secondary: "bg-[#f5f5f5] dark:bg-white/10 text-[#111111] dark:text-white hover:bg-[#eeeeee]",
    outline: "bg-transparent border-[1.5px] border-[#dedede] dark:border-white/20 text-[#111111] dark:text-white hover:border-[#111111]",
    danger: "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} w-full ${variants[variant as keyof typeof variants]} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}>
      {children}
    </button>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function TenantFoodPage() {
  const [data, setData] = useState<FoodOrdersResponse | null>(null);
  const [ledger, setLedger] = useState<FoodLedgerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => getMonday(getISTDate()));
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [foodNotIncluded, setFoodNotIncluded] = useState(false);

  const weekEnd = addDays(weekStart, 6);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setFoodNotIncluded(false);
      const startDate = toISODate(weekStart);
      const endDate = toISODate(addDays(weekStart, 6));

      const [ordersRes, ledgerRes] = await Promise.all([
        fetch(`/api/tenant/food-orders?startDate=${startDate}&endDate=${endDate}`),
        fetch(`/api/tenant/food-ledger`)
      ]);

      if (!ordersRes.ok) {
        const err = await ordersRes.json();
        if (ordersRes.status === 403 && err.error?.toLowerCase().includes("not available on your stay plan")) {
          setFoodNotIncluded(true);
          return;
        }
        throw new Error(err.error || "Failed to load food orders");
      }

      if (!ledgerRes.ok) {
        const err = await ledgerRes.json();
        throw new Error(err.error || "Failed to load food ledger");
      }

      setData(await ordersRes.json());
      setLedger(await ledgerRes.json());
    } catch (e: unknown) { 
      const eMsg = e instanceof Error ? e.message : String(e);
      notify.error(eMsg || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const prevWeek = () => setWeekStart((d) => addDays(d, -7));
  const nextWeek = () => setWeekStart((d) => addDays(d, 7));
  const goToday = () => setWeekStart(getMonday(getISTDate()));

  // Compute active order day for the new FoodOrderPanel
  let activeOrderDay = null;
  if (data) {
    const now = new Date();
    const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    const currentHour = istTime.getUTCHours();
    
    const isOvernight = data.cutoffStartHour > data.cutoffEndHour;
    let isWindowOpen = false;

    if (isOvernight) {
      isWindowOpen = currentHour >= data.cutoffStartHour || currentHour < data.cutoffEndHour;
    } else {
      isWindowOpen = currentHour >= data.cutoffStartHour && currentHour < data.cutoffEndHour;
    }

    if (isWindowOpen) {
      const targetDate = new Date(istTime);
      if (currentHour >= data.cutoffStartHour) {
        targetDate.setUTCDate(targetDate.getUTCDate() + 1);
      }
      
      const y = targetDate.getUTCFullYear();
      const m = String(targetDate.getUTCMonth() + 1).padStart(2, "0");
      const d = String(targetDate.getUTCDate()).padStart(2, "0");
      const targetDateString = `${y}-${m}-${d}`;

      activeOrderDay = data.days.find((d) => d.forDate === targetDateString) || null;
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0A0A0A] pb-32 text-[#111111] dark:text-white font-sans relative">
      
      {/* ── Top App Bar ── */}
      <header className="px-6 pt-12 pb-6 sticky top-0 bg-[#FAFAFA]/90 dark:bg-[#0A0A0A]/90 backdrop-blur-xl z-40">
        <div>
          <h1 className="text-3xl font-black tracking-tight mb-1">Meal Plan</h1>
          <p className="text-gray-500 font-medium">Manage your daily food preferences</p>
        </div>
      </header>

      <main className="px-6 space-y-6">
        
        {loading ? (
          <DashboardSkeleton />
        ) : foodNotIncluded ? (
          <SoftCard className="text-center py-12">
            <div className="w-20 h-20 bg-amber-50 dark:bg-amber-500/10 rounded-full mx-auto flex items-center justify-center mb-6">
              <UtensilsCrossed className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-2xl font-bold text-black dark:text-white mb-3">Food Plan Not Included</h2>
            <p className="text-gray-500 leading-relaxed mb-8">
              Your current stay plan does not include hostel food services. If you'd like to subscribe to meals, please contact your warden to upgrade your plan.
            </p>
            <Link href="/tenant">
              <PillButton variant="outline">Back to Dashboard</PillButton>
            </Link>
          </SoftCard>
        ) : (
          <>
            {/* Financial Ledger Section (Hidden for Flat Rate) */}
            {ledger?.stay.foodBillingMode !== "FLAT_RATE" && ledger?.walletBalance && (
              <div className="space-y-6 mb-8">
                {(ledger.stay.foodBillingMode === "POSTPAID" || ledger.stay.foodBillingMode === "PREPAID_CONSUMPTION") && ledger.currentCycle && (
                  <FoodDueBanner 
                    balancePaise={ledger.walletBalance.balancePaise} 
                    cycleEnd={ledger.currentCycle.cycleEnd}
                    billingMode={ledger.stay.foodBillingMode}
                  />
                )}
                
                <div className="relative">
                  <FoodWalletMeter 
                    paidPaise={ledger.walletBalance.totalPaidPaise} 
                    consumedPaise={ledger.walletBalance.totalConsumedPaise} 
                  />
                  {(ledger.stay.foodBillingMode === "PREPAID_CONSUMPTION" || ledger.stay.foodBillingMode === "POSTPAID") && (
                    <div className="mt-4">
                      <PillButton onClick={() => setIsTopUpOpen(true)} variant="primary">
                        Top Up Wallet
                      </PillButton>
                    </div>
                  )}
                </div>

                {ledger.dailyBreakdown && ledger.dailyBreakdown.length > 0 && (
                  <FoodDailyBreakdown days={ledger.dailyBreakdown} />
                )}
              </div>
            )}

            {/* Ordering Calendar Section */}
            <div>
              {data && data.cutoffStartHour !== undefined && (
                <div className="mb-8">
                  <FoodOrderPanel 
                    cutoffStartHour={data.cutoffStartHour} 
                    cutoffEndHour={data.cutoffEndHour} 
                    activeOrderDay={activeOrderDay}
                    onOrderUpdated={loadData}
                  />
                </div>
              )}
              
              <h2 className="text-xl font-black mb-4">Historical Orders</h2>
              
              <SoftCard className="p-2 flex items-center justify-between shadow-sm mb-6">
                <button onClick={prevWeek} className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                  <ChevronLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
                
                <div className="flex flex-col items-center">
                  <span className="text-[14px] font-bold text-black dark:text-white">
                    {formatDateShort(weekStart)} - {formatDateShort(weekEnd)}
                  </span>
                  <button onClick={goToday} className="text-[11px] font-bold text-gray-400 uppercase tracking-wider hover:text-black dark:hover:text-white mt-1">
                    Go to Today
                  </button>
                </div>
                
                <button onClick={nextWeek} className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                  <ChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </SoftCard>

              {data && (
                <div className="space-y-4">
                  {data.days.map((day) => {
                    const parsedDate = new Date(`${day.forDate}T00:00:00.000Z`);
                    const dayLabel = DAY_LABELS[parsedDate.getUTCDay()];
                    const isToday = day.forDate === toISODate(getISTDate());

                    return (
                      <SoftCard 
                        key={day.forDate} 
                        className={`p-0 overflow-hidden border-2 transition-all ${
                          isToday ? "border-[#58ff48] shadow-lg shadow-[#58ff48]/10" : "border-transparent"
                        }`}
                      >
                        <div className={`h-2 w-full ${isToday ? "bg-[#58ff48]" : "bg-gray-100 dark:bg-white/5"}`} />
                        
                        <div className="p-5">
                          <div className="flex justify-between items-start mb-5">
                            <div>
                              <p className={`text-[12px] font-bold uppercase tracking-wider ${isToday ? "text-[#1a8a10] dark:text-[#58ff48]" : "text-gray-400"}`}>
                                {dayLabel} {isToday && "(Today)"}
                              </p>
                              <h3 className="text-xl font-black mt-1">
                                {parsedDate.getUTCDate()} {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][parsedDate.getUTCMonth()]}
                              </h3>
                            </div>
                            {!day.isEditable && !isToday && (
                              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                                <Lock className="w-4 h-4 text-gray-400" />
                              </div>
                            )}
                          </div>

                          <div className="space-y-2 mt-2">
                            <div className={`w-full h-12 px-4 rounded-[12px] flex items-center font-bold text-[14px] ${
                                day.breakfast 
                                  ? "bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-300 border border-amber-200 dark:border-amber-800" 
                                  : "bg-gray-50 text-gray-400 dark:bg-white/5 border border-transparent"
                              }`}
                            >
                              <Coffee className={`w-4 h-4 mr-3 ${day.breakfast ? "text-amber-600 dark:text-amber-400" : "text-gray-400"}`} />
                              Breakfast
                              {day.breakfast && <span className="ml-auto text-amber-600 dark:text-amber-400">✓</span>}
                            </div>

                            <div className={`w-full h-12 px-4 rounded-[12px] flex items-center font-bold text-[14px] ${
                                day.lunch 
                                  ? "bg-orange-50 text-orange-900 dark:bg-orange-900/20 dark:text-orange-300 border border-orange-200 dark:border-orange-800" 
                                  : "bg-gray-50 text-gray-400 dark:bg-white/5 border border-transparent"
                              }`}
                            >
                              <Sun className={`w-4 h-4 mr-3 ${day.lunch ? "text-orange-600 dark:text-orange-400" : "text-gray-400"}`} />
                              Lunch
                              {day.lunch && <span className="ml-auto text-orange-600 dark:text-orange-400">✓</span>}
                            </div>

                            <div className={`w-full h-12 px-4 rounded-[12px] flex items-center font-bold text-[14px] ${
                                day.dinner 
                                  ? "bg-indigo-50 text-indigo-900 dark:bg-indigo-900/20 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800" 
                                  : "bg-gray-50 text-gray-400 dark:bg-white/5 border border-transparent"
                              }`}
                            >
                              <Moon className={`w-4 h-4 mr-3 ${day.dinner ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400"}`} />
                              Dinner
                              {day.dinner && <span className="ml-auto text-indigo-600 dark:text-indigo-400">✓</span>}
                            </div>
                          </div>
                        </div>
                      </SoftCard>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* ── Fixed Bottom Navigation Bar ── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-[#111111]/90 backdrop-blur-xl border-t border-gray-100 dark:border-white/5 z-50 pb-safe">
        <div className="max-w-md mx-auto flex justify-between items-center px-6 py-3">
          
          <Link href="/tenant" className="relative">
            <div className="p-3">
              <Home className="w-6 h-6 text-gray-400 hover:text-gray-600 transition-colors" />
            </div>
          </Link>

          <Link href="/tenant" className="relative">
            <div className="p-3">
              <Wallet className="w-6 h-6 text-gray-400 hover:text-gray-600 transition-colors" />
            </div>
          </Link>

          <button className="relative cursor-default">
            <div className="flex items-center gap-2 px-5 py-2.5 bg-black dark:bg-[#58ff48] rounded-full shadow-md animate-in zoom-in-95 duration-200">
              <Utensils className="w-5 h-5 text-white dark:text-black" />
              <span className="text-[13px] font-bold text-white dark:text-black">Food</span>
            </div>
          </button>

          <Link href="/tenant" className="relative">
            <div className="p-3">
              <UserIcon className="w-6 h-6 text-gray-400 hover:text-gray-600 transition-colors" />
            </div>
          </Link>

        </div>
      </nav>

      {/* Modals */}
      <FoodTopUpModal 
        isOpen={isTopUpOpen} 
        onClose={() => setIsTopUpOpen(false)} 
        onSuccess={() => loadData()}
      />
    </div>
  );
}
