"use client";

import { useEffect, useState, useCallback, useOptimistic, useTransition } from "react";
import {
  ChevronLeft, ChevronRight, Coffee, Sun, Moon,
  Search, Lock, Unlock, Download, Users, TrendingUp, TrendingDown,
} from "lucide-react";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ResidentFoodEntry {
  stayId: string;
  tenantName: string;
  tenantPhotoUrl: string | null;
  roomNumber: string;
  bedLabel: string;
  foodPlan: string;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  hasOrder: boolean;
  confirmedAt: string | null;
  lockedAt: string | null;
}

interface FoodStatsResponse {
  date: string;
  hostelId: string;
  lockingStatus: "OPEN" | "LOCKED";
  summary: {
    totalResidents: number;
    breakfastCount: number;
    lunchCount: number;
    dinnerCount: number;
  };
  residents: ResidentFoodEntry[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatFoodPlanLabel(plan: string) {
  const labels: Record<string, string> = {
    BREAKFAST_ONLY: "Bfast Only",
    BREAKFAST_DINNER: "Bfast + Dinner",
    BLD: "Bfast, Lunch & Dinner",
    NOT_INCLUDED: "No Plan",
  };
  return labels[plan] ?? plan;
}

function formatDisplayDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00.000+05:30`);
  return d.toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

// ─── Meal Check Cell ──────────────────────────────────────────────────────────
function MealCheckbox({
  checked,
  disabled,
  isLocked,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  isLocked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        "size-[22px] rounded-[4px] border flex items-center justify-center transition-all mx-auto",
        checked
          ? "bg-[#282828] border-[#282828]"
          : "bg-[#f8f7f7] border-[#dedede]",
        disabled && !checked && "opacity-50 cursor-not-allowed",
        !disabled && "hover:border-[#282828] cursor-pointer"
      )}
      title={isLocked ? "Orders locked — warden can still mark attendance" : "Toggle meal"}
    >
      {checked && (
        <svg viewBox="0 0 10 8" className="size-3 text-white fill-current" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      )}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function HostelFoodView({
  hostelId,
  baseRoute,
}: {
  hostelId: string | null;
  baseRoute: string;
}) {
  const [data, setData] = useState<FoodStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => toISODate(new Date()));
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "ELIGIBLE" | "ORDERED">("ALL");
  const [toggling, setToggling] = useState<string | null>(null); // stayId+meal key

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/warden/food-stats?date=${selectedDate}${hostelId ? `&hostelId=${hostelId}` : ""}`
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to load food stats");
      }
      const json = await res.json();
      setData(json);
    } catch (e: unknown) {
      notify.error(e instanceof Error ? e.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, hostelId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const prevDay = () => setSelectedDate((d) => toISODate(addDays(new Date(`${d}T00:00:00.000+05:30`), -1)));
  const nextDay = () => setSelectedDate((d) => toISODate(addDays(new Date(`${d}T00:00:00.000+05:30`), 1)));
  const goToday = () => setSelectedDate(toISODate(new Date()));
  const isToday = selectedDate === toISODate(new Date());

  // ─── Toggle a meal for a resident (warden override) ────────────────────────
  const handleToggleMeal = async (
    stayId: string,
    meal: "breakfast" | "lunch" | "dinner",
    currentVal: boolean
  ) => {
    const key = `${stayId}-${meal}`;
    if (toggling === key) return;

    // Optimistic update
    setData((prev) => {
      if (!prev) return prev;
      const newResidents = prev.residents.map((r) => {
        if (r.stayId !== stayId) return r;
        const updated = { ...r, [meal]: !currentVal, hasOrder: true };
        return updated;
      });
      const breakfastCount = newResidents.filter((r) => r.breakfast).length;
      const lunchCount = newResidents.filter((r) => r.lunch).length;
      const dinnerCount = newResidents.filter((r) => r.dinner).length;
      return {
        ...prev,
        residents: newResidents,
        summary: { ...prev.summary, breakfastCount, lunchCount, dinnerCount },
      };
    });

    setToggling(key);
    try {
      const res = await fetch("/api/warden/food-mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stayId,
          forDate: selectedDate,
          [meal]: !currentVal,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }
    } catch (e: unknown) {
      // Revert on error
      notify.error(e instanceof Error ? e.message : "Failed to update meal");
      await loadData();
    } finally {
      setToggling(null);
    }
  };

  // ─── Filter ────────────────────────────────────────────────────────────────
  const filteredResidents = data?.residents.filter((r) => {
    const matchesSearch =
      r.tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.roomNumber.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (filterType === "ELIGIBLE") return r.foodPlan !== "NOT_INCLUDED";
    if (filterType === "ORDERED") return r.hasOrder;
    return true;
  }) ?? [];

  // ─── Stats ─────────────────────────────────────────────────────────────────
  const stats = data?.summary;
  const eligibleCount = data?.residents.filter((r) => r.foodPlan !== "NOT_INCLUDED").length ?? 0;

  const STAT_CARDS = [
    {
      label: "Breakfast",
      value: stats?.breakfastCount ?? 0,
      pct: eligibleCount > 0 ? Math.round(((stats?.breakfastCount ?? 0) / eligibleCount) * 100) : 0,
      icon: Coffee,
      color: "text-[#d97706]",
      bgColor: "bg-[#fffbeb]",
    },
    {
      label: "Lunch",
      value: stats?.lunchCount ?? 0,
      pct: eligibleCount > 0 ? Math.round(((stats?.lunchCount ?? 0) / eligibleCount) * 100) : 0,
      icon: Sun,
      color: "text-[#ea580c]",
      bgColor: "bg-[#fff7ed]",
    },
    {
      label: "Dinner",
      value: stats?.dinnerCount ?? 0,
      pct: eligibleCount > 0 ? Math.round(((stats?.dinnerCount ?? 0) / eligibleCount) * 100) : 0,
      icon: Moon,
      color: "text-[#4f46e5]",
      bgColor: "bg-[#eef2ff]",
    },
    {
      label: "Total Residents",
      value: stats?.totalResidents ?? 0,
      pct: null,
      icon: Users,
      color: "text-[#0891b2]",
      bgColor: "bg-[#ecfeff]",
    },
  ];

  const FILTER_TABS = [
    { id: "ALL" as const, label: "All Residents", count: data?.residents.length ?? 0 },
    { id: "ELIGIBLE" as const, label: "Active Food Plans", count: eligibleCount },
    { id: "ORDERED" as const, label: "Ordered Today", count: data?.residents.filter((r) => r.hasOrder).length ?? 0 },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 px-4 py-5 w-full max-w-[1400px] mx-auto bg-white dark:bg-black min-h-screen">

      {/* ── Page Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between pb-5 border-b border-[#dedede]">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-black dark:text-white">Food Dashboard</h1>
          <p className="text-[#767676] text-[14px] mt-0.5">{formatDisplayDate(selectedDate)}</p>
        </div>
        <div className="flex items-center gap-2 self-start flex-wrap">
          <button
            onClick={goToday}
            disabled={isToday}
            className="h-10 px-4 rounded-[6px] border border-[#dedede] text-[14px] font-semibold text-[#767676] hover:text-black hover:border-[#c0c0c0] transition-colors flex items-center gap-2 disabled:opacity-40"
          >
            Today
          </button>
          <button
            onClick={async () => {
              if (!data) return;
              notify.success("Export feature coming soon!");
            }}
            className="h-10 px-4 rounded-[6px] border border-[#dedede] text-[14px] font-semibold text-[#767676] hover:text-black hover:border-[#c0c0c0] transition-colors flex items-center gap-2"
          >
            <Download className="size-4" />
            Export Order
          </button>
        </div>
      </div>

      {/* ── Date Navigation ── */}
      <div className="py-4 flex items-center gap-3">
        <button
          onClick={prevDay}
          className="size-9 rounded-[6px] border border-[#dedede] flex items-center justify-center text-[#767676] hover:text-black hover:border-[#c0c0c0] transition-colors"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          onClick={nextDay}
          className="size-9 rounded-[6px] border border-[#dedede] flex items-center justify-center text-[#767676] hover:text-black hover:border-[#c0c0c0] transition-colors"
        >
          <ChevronRight className="size-4" />
        </button>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
          className="h-9 px-3 rounded-[6px] border border-[#dedede] text-[13px] font-semibold text-black focus:outline-none focus:border-[#282828] bg-white cursor-pointer"
        />
        {/* Locking status */}
        {data && (
          <span className={cn(
            "inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full ml-2",
            data.lockingStatus === "OPEN"
              ? "bg-[#dcfce7] text-[#15803d]"
              : "bg-[#fef3c7] text-[#b45309]"
          )}>
            {data.lockingStatus === "OPEN"
              ? <><Unlock className="size-3" /> Orders OPEN</>
              : <><Lock className="size-3" /> Orders LOCKED</>
            }
          </span>
        )}
        {data && data.lockingStatus === "LOCKED" && (
          <span className="text-[12px] text-[#a1a1a1] hidden sm:inline">
            Cutoff passed — wardens can still mark attendance
          </span>
        )}
      </div>

      {/* ── Meal Count Stats ── */}
      <div className="mb-6">
        <h2 className="text-[16px] font-bold text-black dark:text-white mb-3">Meal Counts (Today)</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {loading
            ? Array(4).fill(0).map((_, i) => (
                <div key={i} className="rounded-[7px] border border-[#dedede] p-4 animate-pulse">
                  <div className="h-4 w-20 bg-[#f2f2f2] rounded mb-4" />
                  <div className="h-8 w-12 bg-[#f2f2f2] rounded" />
                </div>
              ))
            : STAT_CARDS.map((s) => {
                const Icon = s.icon;
                const isUp = s.pct !== null && s.pct >= 50;
                return (
                  <div key={s.label} className="rounded-[7px] border border-[#dedede] bg-white p-4">
                    <div className="flex items-start justify-between mb-3">
                      <p className="text-[14px] font-semibold text-black dark:text-white">{s.label}</p>
                      <div className={cn("size-8 rounded-[6px] flex items-center justify-center", s.bgColor)}>
                        <Icon className={cn("size-4", s.color)} />
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <p className="text-[30px] font-bold text-black dark:text-white leading-none">{s.value}</p>
                      {s.pct !== null && (
                        <div className={cn(
                          "flex items-center gap-0.5 text-[13px] font-semibold",
                          isUp ? "text-[#15803d]" : "text-[#767676]"
                        )}>
                          {isUp ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                          {s.pct}%
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
          }
        </div>
      </div>

      {/* ── Attendance Table ── */}
      <h2 className="text-[16px] font-bold text-black dark:text-white mb-3">Meal Attendance</h2>

      {/* Filter + Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          {FILTER_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setFilterType(t.id)}
              className={cn(
                "h-9 px-3 rounded-[6px] text-[13px] font-semibold transition-all flex items-center gap-2",
                filterType === t.id
                  ? "bg-[#282828] text-white"
                  : "border border-[#dedede] text-[#767676] hover:text-black hover:border-[#c0c0c0] bg-white"
              )}
            >
              {t.label}
              <span className={cn(
                "text-[11px] px-1.5 py-0.5 rounded-full",
                filterType === t.id ? "bg-white/20 text-white" : "bg-[#f2f2f2] text-[#767676]"
              )}>
                {t.count}
              </span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#a1a1a1]" />
          <input
            type="text"
            placeholder="Search by name or room..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-[6px] border border-[#dedede] bg-white text-[13px] text-black placeholder:text-[#a1a1a1] outline-none focus:border-[#282828] transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block rounded-[7px] border border-[#dedede] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-[#f2f2f2] bg-[#fafafa]">
                    <th className="px-4 py-3 text-[12px] font-semibold text-[#767676] uppercase tracking-wide text-left">Resident</th>
                    <th className="px-4 py-3 text-[12px] font-semibold text-[#767676] uppercase tracking-wide text-left">Room</th>
                    <th className="px-4 py-3 text-[12px] font-semibold text-[#767676] uppercase tracking-wide text-left">Food Plan</th>
                    <th className="px-4 py-3 text-[12px] font-semibold text-[#767676] uppercase tracking-wide text-center">Breakfast</th>
                    <th className="px-4 py-3 text-[12px] font-semibold text-[#767676] uppercase tracking-wide text-center">Lunch</th>
                    <th className="px-4 py-3 text-[12px] font-semibold text-[#767676] uppercase tracking-wide text-center">Dinner</th>
                    <th className="px-4 py-3 text-[12px] font-semibold text-[#767676] uppercase tracking-wide text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResidents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center text-[14px] text-[#a1a1a1] font-medium">
                        {searchQuery ? "No residents match your search" : "No residents in this list"}
                      </td>
                    </tr>
                  ) : (
                    filteredResidents.map((r) => {
                      const hasNoPlan = r.foodPlan === "NOT_INCLUDED";
                      const isLocked = data?.lockingStatus === "LOCKED";
                      return (
                        <tr
                          key={r.stayId}
                          className="border-b border-[#f2f2f2] last:border-0 bg-white hover:bg-[#fafafa] transition-colors"
                        >
                          {/* Resident */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="size-9 rounded-full bg-[#e0e0e0] flex items-center justify-center text-[12px] font-bold text-[#5c5c5c] shrink-0">
                                {r.tenantName.slice(0, 2).toUpperCase()}
                              </div>
                              <p className="text-[14px] font-semibold text-black dark:text-white">{r.tenantName}</p>
                            </div>
                          </td>

                          {/* Room */}
                          <td className="px-4 py-3">
                            <span className="text-[13px] font-medium text-[#767676]">{r.roomNumber}-{r.bedLabel}</span>
                          </td>

                          {/* Food Plan */}
                          <td className="px-4 py-3">
                            <span className={cn(
                              "text-[11px] font-bold px-2.5 py-1 rounded-full",
                              hasNoPlan
                                ? "bg-[#f2f2f2] text-[#a1a1a1]"
                                : r.foodPlan === "BLD"
                                  ? "bg-[#dbeafe] text-[#1e40af]"
                                  : "bg-[#f3e8ff] text-[#7e22ce]"
                            )}>
                              {formatFoodPlanLabel(r.foodPlan)}
                            </span>
                          </td>

                          {/* Breakfast */}
                          <td className="px-4 py-3 text-center">
                            {hasNoPlan ? (
                              <span className="text-[#dedede] font-bold">—</span>
                            ) : (
                              <MealCheckbox
                                checked={r.breakfast}
                                disabled={toggling === `${r.stayId}-breakfast`}
                                isLocked={isLocked ?? false}
                                onChange={(val) => handleToggleMeal(r.stayId, "breakfast", r.breakfast)}
                              />
                            )}
                          </td>

                          {/* Lunch */}
                          <td className="px-4 py-3 text-center">
                            {hasNoPlan ? (
                              <span className="text-[#dedede] font-bold">—</span>
                            ) : (
                              <MealCheckbox
                                checked={r.lunch}
                                disabled={toggling === `${r.stayId}-lunch`}
                                isLocked={isLocked ?? false}
                                onChange={(val) => handleToggleMeal(r.stayId, "lunch", r.lunch)}
                              />
                            )}
                          </td>

                          {/* Dinner */}
                          <td className="px-4 py-3 text-center">
                            {hasNoPlan ? (
                              <span className="text-[#dedede] font-bold">—</span>
                            ) : (
                              <MealCheckbox
                                checked={r.dinner}
                                disabled={toggling === `${r.stayId}-dinner`}
                                isLocked={isLocked ?? false}
                                onChange={(val) => handleToggleMeal(r.stayId, "dinner", r.dinner)}
                              />
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3 text-center">
                            {hasNoPlan ? (
                              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#f2f2f2] text-[#a1a1a1]">
                                INELIGIBLE
                              </span>
                            ) : r.hasOrder ? (
                              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#dcfce7] text-[#15803d]">
                                ORDERED
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#f2f2f2] text-[#767676]">
                                NO ORDER
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden flex flex-col gap-3">
            {filteredResidents.length === 0 ? (
              <div className="py-16 text-center text-[14px] text-[#a1a1a1]">
                {searchQuery ? "No residents match your search" : "No residents in this list"}
              </div>
            ) : (
              filteredResidents.map((r) => {
                const hasNoPlan = r.foodPlan === "NOT_INCLUDED";
                const isLocked = data?.lockingStatus === "LOCKED";
                return (
                  <div key={r.stayId} className="rounded-[7px] border border-[#dedede] bg-white p-4">
                    {/* Resident header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-[#e0e0e0] flex items-center justify-center text-[13px] font-bold text-[#5c5c5c]">
                          {r.tenantName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[14px] font-bold text-black">{r.tenantName}</p>
                          <p className="text-[12px] text-[#767676]">{r.roomNumber}-{r.bedLabel}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full",
                          hasNoPlan ? "bg-[#f2f2f2] text-[#a1a1a1]"
                            : r.foodPlan === "BLD" ? "bg-[#dbeafe] text-[#1e40af]"
                              : "bg-[#f3e8ff] text-[#7e22ce]"
                        )}>
                          {formatFoodPlanLabel(r.foodPlan)}
                        </span>
                        {!hasNoPlan && (
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full",
                            r.hasOrder ? "bg-[#dcfce7] text-[#15803d]" : "bg-[#f2f2f2] text-[#767676]"
                          )}>
                            {r.hasOrder ? "ORDERED" : "NO ORDER"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Meal toggles */}
                    {!hasNoPlan && (
                      <div className="flex gap-3 pt-3 border-t border-[#f2f2f2]">
                        {(["breakfast", "lunch", "dinner"] as const).map((meal) => {
                          const checked = r[meal];
                          const icons = { breakfast: Coffee, lunch: Sun, dinner: Moon };
                          const colors = { breakfast: "text-[#d97706]", lunch: "text-[#ea580c]", dinner: "text-[#4f46e5]" };
                          const MealIcon = icons[meal];
                          return (
                            <button
                              key={meal}
                              onClick={() => handleToggleMeal(r.stayId, meal, checked)}
                              disabled={toggling === `${r.stayId}-${meal}`}
                              className={cn(
                                "flex-1 h-10 rounded-[6px] border text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-all",
                                checked
                                  ? "bg-[#282828] border-[#282828] text-white"
                                  : "border-[#dedede] text-[#767676] hover:border-[#282828] hover:text-black"
                              )}
                            >
                              <MealIcon className={cn("size-3.5", checked ? "text-white" : colors[meal])} />
                              <span className="capitalize">{meal}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {hasNoPlan && (
                      <div className="pt-3 border-t border-[#f2f2f2] text-center text-[12px] text-[#a1a1a1]">
                        No food plan assigned
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Results count */}
          <p className="text-[12px] text-[#a1a1a1] mt-3">
            Showing {filteredResidents.length} of {data?.residents.length ?? 0} residents
          </p>
        </>
      )}
    </div>
  );
}

// ─── Table Skeleton ───────────────────────────────────────────────────────────
function TableSkeleton() {
  return (
    <div className="rounded-[7px] border border-[#dedede] overflow-hidden">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-[#f2f2f2] last:border-0 animate-pulse">
          <div className="size-9 rounded-full bg-[#f2f2f2] shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-32 rounded bg-[#f2f2f2]" />
            <div className="h-3 w-20 rounded bg-[#f2f2f2]" />
          </div>
          <div className="h-6 w-20 rounded-full bg-[#f2f2f2]" />
          {[...Array(3)].map((_, j) => (
            <div key={j} className="size-6 rounded-[4px] bg-[#f2f2f2]" />
          ))}
          <div className="h-6 w-16 rounded-full bg-[#f2f2f2]" />
        </div>
      ))}
    </div>
  );
}
