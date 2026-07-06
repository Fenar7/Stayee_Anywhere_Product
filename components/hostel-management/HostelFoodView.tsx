"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ChevronLeft, ChevronRight, Download, Bell,
  Calendar, Search, Plus, Maximize2,
} from "lucide-react";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────────
interface ResidentFoodEntry {
  stayId: string;
  tenantName: string;
  roomNumber: string;
  bedLabel: string;
  foodPlan: string;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  tea: boolean;
  cutFruits: boolean;
  gymDiet: boolean;
  hasOrder: boolean;
}

interface DayData {
  date: string; // YYYY-MM-DD in IST
  dayName: string; // "Mon"
  dayNumber: number; // 1-31
  isToday: boolean;
  residents: ResidentFoodEntry[];
}

interface TodaySummary {
  totalResidents: number;
  eligibleResidents: number;
  breakfastCount: number;
  lunchCount: number;
  dinnerCount: number;
  teaCount: number;
}

interface WeekData {
  weekStart: string;
  weekDays: DayData[];
  todaySummary: TodaySummary;
  hostelId: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────
function getMondayOfWeek(d: Date): string {
  const date = new Date(d);
  const day = date.getDay(); // 0=Sun
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date.toISOString().split("T")[0];
}

function shiftWeek(weekStart: string, delta: number): string {
  const d = new Date(`${weekStart}T00:00:00.000+05:30`);
  d.setDate(d.getDate() + delta * 7);
  return d.toISOString().split("T")[0];
}

function formatHeaderDate(): string {
  // Matches Figma: "Thursday 25th March 2026"
  const d = new Date();
  const dayName = d.toLocaleDateString("en-US", { weekday: "long" });
  const dayNumber = d.getDate();
  const month = d.toLocaleDateString("en-US", { month: "long" });
  const year = d.getFullYear();

  const ordinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return `${dayName} ${ordinal(dayNumber)} ${month} ${year}`;
}

// ─── Meal columns definition ────────────────────────────────────────────────────
const MEAL_COLS = [
  { key: "breakfast" as const, label: "Break Fast" },
  { key: "lunch"     as const, label: "Lunch"      },
  { key: "dinner"    as const, label: "Dinner"     },
  { key: "tea"       as const, label: "Tea"        },
  { key: "cutFruits" as const, label: "Cut Fruits" },
  { key: "gymDiet"   as const, label: "Gym Diet"   },
] as const;

type MealKey = typeof MEAL_COLS[number]["key"];

import { HostelWorkspaceLayout } from "./HostelWorkspaceLayout";

// ─── Main Component ──────────────────────────────────────────────────────────────
export default function HostelFoodView({
  hostelId,
  hostelName,
  baseRoute,
}: {
  hostelId: string | null;
  hostelName?: string;
  baseRoute: string;
}) {
  const [weekStart, setWeekStart] = useState<string>(() => getMondayOfWeek(new Date()));
  const [weekData, setWeekData] = useState<WeekData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);

  // ── Fetch weekly data ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ weekStart });
      if (hostelId) params.append("hostelId", hostelId);
      const res = await fetch(`/api/warden/food-week?${params}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to load food data");
      }
      setWeekData(await res.json());
    } catch (e: unknown) {
      notify.error(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [weekStart, hostelId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Toggle a meal (optimistic) ─────────────────────────────────────────────────
  const handleToggle = async (
    stayId: string,
    date: string,
    meal: MealKey,
    currentVal: boolean
  ) => {
    if (stayId.startsWith("mock-")) {
      // Mock data toggle just for visual feedback
      setWeekData((prev) => {
        if (!prev) return prev;
        const newDays = prev.weekDays.map((day) => {
          if (day.date !== date) return day;
          return {
            ...day,
            residents: day.residents.map((r) =>
              r.stayId === stayId ? { ...r, [meal]: !currentVal, hasOrder: true } : r
            ),
          };
        });
        return { ...prev, weekDays: newDays };
      });
      return;
    }

    const key = `${stayId}-${date}-${meal}`;
    if (toggling === key) return;

    const newVal = !currentVal;

    // Optimistic update
    setWeekData((prev) => {
      if (!prev) return prev;
      const todayStr = new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().split("T")[0];
      const newDays = prev.weekDays.map((day) => {
        if (day.date !== date) return day;
        return {
          ...day,
          residents: day.residents.map((r) =>
            r.stayId === stayId ? { ...r, [meal]: newVal, hasOrder: true } : r
          ),
        };
      });
      // Update today summary if this is today
      let todaySummary = prev.todaySummary;
      if (date === todayStr) {
        const delta = newVal ? 1 : -1;
        todaySummary = {
          ...todaySummary,
          breakfastCount: meal === "breakfast" ? todaySummary.breakfastCount + delta : todaySummary.breakfastCount,
          lunchCount: meal === "lunch" ? todaySummary.lunchCount + delta : todaySummary.lunchCount,
          dinnerCount: meal === "dinner" ? todaySummary.dinnerCount + delta : todaySummary.dinnerCount,
          teaCount: meal === "tea" ? todaySummary.teaCount + delta : todaySummary.teaCount,
        };
      }
      return { ...prev, weekDays: newDays, todaySummary };
    });

    setToggling(key);
    try {
      const res = await fetch("/api/warden/food-mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostelId, stayId, forDate: date, [meal]: newVal }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to update");
    } catch (e: unknown) {
      notify.error(e instanceof Error ? e.message : "Failed to update meal");
      await loadData(); // revert on error
    } finally {
      setToggling(null);
    }
  };

  // ── Filter residents by search ─────────────────────────────────────────────────
  const filterResidents = (residents: ResidentFoodEntry[]) => {
    if (!search.trim()) return residents;
    const q = search.toLowerCase();
    return residents.filter(
      (r) =>
        r.tenantName.toLowerCase().includes(q) ||
        r.roomNumber.toLowerCase().includes(q)
    );
  };

  // ── Derived state ──────────────────────────────────────────────────────────────
  const s = weekData?.todaySummary;
  // If mock data is present, mock the eligible count for the cards to look like Figma
  const hasMockData = weekData?.weekDays[0]?.residents[0]?.stayId.startsWith("mock-");
  
  const eligible = hasMockData ? 100 : Math.max(1, s?.eligibleResidents ?? 1);
  const mockB = hasMockData ? 23 : (s?.breakfastCount ?? 0);
  const mockL = hasMockData ? 78 : (s?.lunchCount ?? 0);
  const mockD = hasMockData ? 6 : (s?.dinnerCount ?? 0);
  const mockT = hasMockData ? 5 : (s?.teaCount ?? 0);

  const STAT_CARDS = [
    { label: "Breakfast", count: mockB, pct: hasMockData ? 23 : Math.round((mockB / eligible) * 100), trend: "up" },
    { label: "Lunch",     count: mockL, pct: hasMockData ? 78 : Math.round((mockL / eligible) * 100), trend: "up" },
    { label: "Dinner",    count: mockD, pct: hasMockData ? "+10" : Math.round((mockD / eligible) * 100), trend: "up" },
    { label: "Tea",       count: mockT, pct: hasMockData ? "-10" : Math.round((mockT / eligible) * 100), trend: "down" },
  ];

  const firstDay = weekData?.weekDays?.[0];
  const weekLabel = firstDay
    ? `${firstDay.dayName} ${firstDay.dayNumber}`
    : "—";

  // ─────────────────────────────────────────────────────────────────────────────
  const Actions = (
    <>
      {/* Bell */}
      <button
        onClick={() => notify.info("No new notifications")}
        className="size-[40px] rounded-md border border-[#e5e7eb] bg-white flex items-center justify-center text-[#4b5563] hover:text-[#111] hover:border-[#d1d5db] transition-colors"
      >
        <Bell className="size-4" strokeWidth={2} />
      </button>
      {/* Manage Meals Pricing */}
      <button
        onClick={() => notify.info("Meal pricing management — coming soon")}
        className="h-[40px] px-4 rounded-md border border-[#e5e7eb] bg-white text-[13px] font-medium text-[#1a1a1a] hover:bg-[#f9fafb] transition-colors flex items-center gap-2 whitespace-nowrap"
      >
        Manage Meals Pricing <Plus className="size-[15px] text-[#22c55e]" strokeWidth={2.5} />
      </button>
      {/* On Board a User */}
      <Link
        href={`${baseRoute}/onboard`}
        className="h-[40px] px-4 rounded-md bg-[#1f2937] text-white text-[13px] font-medium flex items-center gap-2 hover:bg-[#111827] transition-colors whitespace-nowrap"
      >
        On Board a User <Plus className="size-[15px] text-[#22c55e]" strokeWidth={2.5} />
      </Link>
    </>
  );

  return (
    <HostelWorkspaceLayout
      hostelId={hostelId || ""}
      hostelName={hostelName}
      title="Food Dashboard"
      subtitle={formatHeaderDate()}
      actions={Actions}
    >
      <div className="w-full">

      {/* ── Meal Counts (Today) ─────────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] font-semibold text-[#1a1a1a]">Meal Counts (Today)</h2>
          <div className="flex items-center gap-3">
            <button className="h-[36px] px-3.5 rounded-md border border-[#e5e7eb] bg-white text-[13px] font-medium text-[#1a1a1a] hover:bg-[#f9fafb] transition-colors flex items-center gap-2">
              Today <Calendar className="size-[15px] text-[#4b5563]" />
            </button>
            <button
              onClick={() => notify.info("Export coming soon!")}
              className="h-[36px] px-3.5 rounded-md border border-[#e5e7eb] bg-white text-[13px] font-medium text-[#1a1a1a] hover:bg-[#f9fafb] transition-colors flex items-center gap-2"
            >
              Export Order <Download className="size-[15px] text-[#4b5563]" />
            </button>
          </div>
        </div>

        {/* Stat Cards — 4 in a row */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {loading
            ? Array(4).fill(0).map((_, i) => (
                <div
                  key={i}
                  className="h-[104px] rounded-lg border border-[#e5e7eb] bg-white animate-pulse"
                />
              ))
            : STAT_CARDS.map((card) => {
                const isUp = card.trend === "up";
                return (
                  <div
                    key={card.label}
                    className="h-[104px] rounded-lg border border-[#e5e7eb] bg-white p-4 relative flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between">
                      <p className="text-[13px] font-medium text-[#4b5563]">{card.label}</p>
                      {/* Diagonal arrow */}
                      <svg
                        viewBox="0 0 20 20"
                        className={cn("size-[18px] text-[#4b5563]", !isUp && "rotate-[90deg]")}
                        fill="none"
                        stroke="currentColor"
                      >
                        <path
                          d="M5 15L15 5M15 5H7M15 5V13"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div className="flex items-end justify-between">
                      <p className="text-[32px] font-semibold text-[#1a1a1a] leading-none">{card.count}</p>
                      <p className="text-[13px] text-[#9ca3af]">{card.pct}%</p>
                    </div>
                  </div>
                );
              })}
        </div>
      </div>

      {/* ── Meal Attendance ─────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-[18px] font-semibold text-[#1a1a1a] mb-4">Meal Attendance</h2>

        {/* Table + Right Panel container */}
        <div className="flex rounded-xl border border-[#e5e7eb] bg-white overflow-hidden shadow-sm">

          {/* ── Main Table ── */}
          <div className="flex-1 overflow-x-auto min-w-0">
            {loading ? (
              <LoadingSkeleton />
            ) : (
              <table className="w-full min-w-[780px] border-collapse">
                {/* Header */}
                <thead>
                  <tr>
                    <th className="px-6 py-[18px] text-left text-[14px] font-semibold text-[#1a1a1a] whitespace-nowrap w-[110px]">
                      Date
                    </th>
                    <th className="px-4 py-[18px] text-left text-[14px] font-semibold text-[#1a1a1a] whitespace-nowrap">
                      Tenant
                    </th>
                    {MEAL_COLS.map((col) => (
                      <th
                        key={col.key}
                        className="px-3 py-[18px] text-center text-[13px] font-semibold text-[#1a1a1a] whitespace-nowrap w-[88px]"
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Body */}
                <tbody>
                  {(() => {
                    const rows: React.ReactNode[] = [];
                    let globalIdx = 0;

                    for (let di = 0; di < (weekData?.weekDays.length ?? 0); di++) {
                      const day = weekData!.weekDays[di];
                      const residents = filterResidents(day.residents);
                      if (residents.length === 0) continue;

                      residents.forEach((r, ri) => {
                        const isFirstInDay = ri === 0;
                        const hasNoPlan = r.foodPlan === "NOT_INCLUDED";

                        rows.push(
                          <tr
                            key={`${day.date}-${r.stayId}`}
                            className="group transition-colors hover:bg-[#f9fafb]"
                          >
                            {/* Date cell */}
                            <td className="px-6 py-[14px] align-top">
                              {isFirstInDay ? (
                                <div className="flex items-center gap-3 pt-1">
                                  <span className="text-[14px] text-[#1a1a1a] w-[32px]">
                                    {day.dayName}
                                  </span>
                                  <div
                                    className={cn(
                                      "size-[26px] rounded-full flex items-center justify-center text-[13px]",
                                      day.isToday || hasMockData && day.dayName === "Mon"
                                        ? "bg-[#4b5563] text-white"
                                        : "text-[#4b5563]"
                                    )}
                                  >
                                    {day.dayNumber}
                                  </div>
                                </div>
                              ) : null}
                            </td>

                            {/* Tenant */}
                            <td className="px-4 py-[14px] align-top pt-[18px]">
                              <p className="text-[13px] font-medium text-[#1a1a1a]">
                                {r.tenantName} ({r.roomNumber} {r.bedLabel})
                              </p>
                            </td>

                            {/* Meal checkboxes */}
                            {MEAL_COLS.map((col) => {
                              const val = r[col.key];
                              const tKey = `${r.stayId}-${day.date}-${col.key}`;
                              const isProcessing = toggling === tKey;
                              return (
                                <td key={col.key} className="py-[14px] text-center align-top pt-[16px]">
                                  <button
                                    onClick={() =>
                                      !hasNoPlan &&
                                      handleToggle(r.stayId, day.date, col.key, val)
                                    }
                                    disabled={hasNoPlan || isProcessing}
                                    className={cn(
                                      "size-[18px] rounded-[4px] border flex items-center justify-center mx-auto transition-all duration-200",
                                      hasNoPlan
                                        ? "bg-gray-100 border-gray-200 opacity-30 cursor-not-allowed"
                                        : val
                                          ? "bg-[#111827] border-[#111827] cursor-pointer"
                                          : "bg-white border-[#d1d5db] hover:border-[#9ca3af] cursor-pointer",
                                      isProcessing && "opacity-50 cursor-wait"
                                    )}
                                  >
                                    {val && !hasNoPlan && (
                                      <svg
                                        viewBox="0 0 10 8"
                                        className="size-[10px]"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                      >
                                        <path
                                          d="M1 4L3.5 6.5L9 1"
                                          stroke="white"
                                          strokeWidth="1.5"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                      </svg>
                                    )}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        );
                        globalIdx++;
                      });
                    }

                    if (rows.length === 0) {
                      return (
                        <tr>
                          <td
                            colSpan={8}
                            className="py-20 text-center text-[14px] text-[#9ca3af]"
                          >
                            {search
                              ? `No residents match "${search}"`
                              : "No active residents found for this week"}
                          </td>
                        </tr>
                      );
                    }

                    return rows;
                  })()}
                </tbody>
              </table>
            )}
          </div>

          {/* ── Right Panel ──────────────────────────────────────────────────────── */}
          <div className="w-[280px] shrink-0 border-l border-[#e5e7eb] flex-col bg-white hidden lg:flex">
            
            {/* Nav and Search Header */}
            <div className="p-4 border-b border-[#f3f4f6]">
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => setWeekStart((w) => shiftWeek(w, -1))}
                  className="size-[32px] rounded-full border border-[#e5e7eb] flex items-center justify-center text-[#4b5563] hover:bg-[#f9fafb] transition-colors"
                >
                  <ChevronLeft className="size-4" strokeWidth={1.5} />
                </button>
                <button
                  onClick={() => setWeekStart((w) => shiftWeek(w, 1))}
                  className="size-[32px] rounded-full border border-[#e5e7eb] flex items-center justify-center text-[#4b5563] hover:bg-[#f9fafb] transition-colors"
                >
                  <ChevronRight className="size-4" strokeWidth={1.5} />
                </button>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-[14px] text-[#9ca3af]" strokeWidth={2} />
                  <input
                    type="text"
                    placeholder="Search tenant"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full h-[32px] pl-9 pr-3 rounded-md border border-[#e5e7eb] text-[13px] text-[#1a1a1a] placeholder:text-[#9ca3af] focus:border-[#4b5563] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Action Links List */}
              <div className="flex flex-col gap-1.5 mt-2">
                <div className="h-[36px] px-3 rounded-md border border-[#e5e7eb] flex items-center gap-3 bg-white">
                  <Calendar className="size-4 text-[#4b5563]" strokeWidth={1.5} />
                  <span className="text-[13px] text-[#4b5563]">{hasMockData ? "March 1" : weekLabel}</span>
                </div>
                
                <button
                  onClick={() => notify.info("Export coming soon!")}
                  className="h-[36px] px-3 rounded-md border border-[#e5e7eb] flex items-center gap-3 bg-white hover:bg-[#f9fafb] transition-colors text-left"
                >
                  <Download className="size-4 text-[#4b5563]" strokeWidth={1.5} />
                  <span className="text-[13px] text-[#4b5563]">Export Order</span>
                </button>

                <button className="h-[36px] px-3 rounded-md border border-[#e5e7eb] flex items-center gap-3 bg-white hover:bg-[#f9fafb] transition-colors text-left">
                  <Maximize2 className="size-4 text-[#4b5563]" strokeWidth={1.5} />
                  <span className="text-[13px] text-[#4b5563]">Expand</span>
                </button>
              </div>
            </div>

            <div className="flex-1" />

            {/* Footer actions */}
            <div className="p-4 border-t border-[#f3f4f6] flex flex-col gap-1.5">
              <button
                onClick={() => setWeekStart(getMondayOfWeek(new Date()))}
                className="h-[36px] px-3 flex items-center gap-3 hover:bg-[#f9fafb] rounded-md transition-colors"
              >
                <Calendar className="size-4 text-[#4b5563]" strokeWidth={1.5} />
                <span className="text-[13px] text-[#4b5563]">This Week</span>
              </button>
              
              <button
                onClick={() => notify.info("Download report coming soon!")}
                className="h-[36px] px-3 rounded-md border border-[#e5e7eb] flex items-center gap-3 bg-white hover:bg-[#f9fafb] transition-colors text-left"
              >
                <Download className="size-4 text-[#4b5563]" strokeWidth={1.5} />
                <span className="text-[13px] text-[#4b5563]">Download Report</span>
              </button>
            </div>

          </div>
        </div>
      </div>
      </div>
    </HostelWorkspaceLayout>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="p-6 space-y-5">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-6 animate-pulse">
          <div className="w-[80px] h-4 rounded bg-gray-200" />
          <div className="flex-1 h-4 rounded bg-gray-200" />
          {[...Array(6)].map((_, j) => (
            <div key={j} className="size-[18px] rounded-[4px] bg-gray-200 shrink-0" />
          ))}
        </div>
      ))}
    </div>
  );
}
