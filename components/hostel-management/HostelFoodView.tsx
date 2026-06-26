"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Loader2, AlertCircle, ChevronLeft, ChevronRight,
  Coffee, Sun, Moon, Search, Users, Lock, Unlock, CalendarDays, Filter
} from "lucide-react";
import { notify } from "@/lib/toast";
import { DashboardSkeleton } from "@/components/shared/DashboardSkeleton";
import { Badge } from "@/components/ui/badge";

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

function toISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatFoodPlanLabel(plan: string) {
  if (plan === "BREAKFAST_ONLY") return "Breakfast Only";
  if (plan === "BREAKFAST_DINNER") return "Breakfast & Dinner";
  if (plan === "BLD") return "Breakfast, Lunch & Dinner";
  if (plan === "NOT_INCLUDED") return "No Plan";
  return plan;
}

export default function HostelFoodView({ hostelId, baseRoute }: { hostelId: string | null; baseRoute: string }) {
  const [data, setData] = useState<FoodStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => toISODate(new Date()));
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "ELIGIBLE" | "ORDERED">("ALL");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/warden/food-stats?date=${selectedDate}${hostelId ? `&hostelId=${hostelId}` : ""}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to load food stats");
      }
      const json = await res.json();
      setData(json);
    } catch (e: unknown) {
      const eMsg = e instanceof Error ? e.message : String(e);
      notify.error(eMsg || "An unexpected error occurred");
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

  const filteredResidents = data?.residents.filter((r) => {
    // 1. Search filter
    const matchesSearch = 
      r.tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.roomNumber.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    // 2. Status filter
    if (filterType === "ELIGIBLE") {
      return r.foodPlan !== "NOT_INCLUDED";
    }
    if (filterType === "ORDERED") {
      return r.hasOrder;
    }

    return true;
  }) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Kitchen Dashboard</h1>
          <p className="text-muted-foreground text-sm">Consolidated meal stats and resident orders for your hostel</p>
        </div>
      </div>

      {/* Date Navigation & Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-card/50 shadow-sm">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={prevDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={nextDay}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToday}>
            Today
          </Button>
        </div>
        <div className="flex items-center gap-3 text-sm font-semibold">
          <CalendarDays className="h-4 w-4 text-primary" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            className="bg-transparent border border-input rounded-md px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer hover:bg-muted/40 transition-all"
          />
        </div>
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : data ? (
        <>
          {/* Locking Status Badge */}
          <div className="flex items-center gap-2">
            {data.lockingStatus === "OPEN" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800 dark:bg-green-950/20 dark:text-green-400">
                <Unlock className="h-3.5 w-3.5 animate-pulse" />
                Orders OPEN
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800 dark:bg-orange-950/20 dark:text-orange-400">
                <Lock className="h-3.5 w-3.5" />
                Orders LOCKED
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {data.lockingStatus === "OPEN"
                ? "Tenants can still modify their meal selections"
                : "Cutoff passed — selections are finalized for this date"}
            </span>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                <Users className="h-4 w-4" />
                Total Residents
              </div>
              <p className="mt-1 text-2xl font-bold">{data.summary.totalResidents}</p>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                <Coffee className="h-4 w-4 text-amber-600" />
                Breakfast
              </div>
              <p className="mt-1 text-2xl font-bold text-amber-600">{data.summary.breakfastCount}</p>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                <Sun className="h-4 w-4 text-orange-500" />
                Lunch
              </div>
              <p className="mt-1 text-2xl font-bold text-orange-500">{data.summary.lunchCount}</p>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                <Moon className="h-4 w-4 text-indigo-500" />
                Dinner
              </div>
              <p className="mt-1 text-2xl font-bold text-indigo-500">{data.summary.dinnerCount}</p>
            </div>
          </div>

          {/* Filters and Search Bar */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
            {/* Filter Tabs */}
            <div className="flex gap-1.5 p-1 rounded-lg bg-muted/40 border w-fit">
              <button
                type="button"
                onClick={() => setFilterType("ALL")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  filterType === "ALL" 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Residents ({data.residents.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType("ELIGIBLE")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  filterType === "ELIGIBLE" 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Active Food Plans ({data.residents.filter(r => r.foodPlan !== "NOT_INCLUDED").length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType("ORDERED")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  filterType === "ORDERED" 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Ordered Today ({data.residents.filter(r => r.hasOrder).length})
              </button>
            </div>

            {/* Search */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name or room..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex h-9 w-full rounded-lg border bg-transparent pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Resident Checklist Table */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-3 text-left font-bold text-muted-foreground uppercase tracking-wider">Resident</th>
                    <th className="px-4 py-3 text-left font-bold text-muted-foreground uppercase tracking-wider">Room</th>
                    <th className="px-4 py-3 text-left font-bold text-muted-foreground uppercase tracking-wider">Food Plan</th>
                    <th className="px-4 py-3 text-center font-bold text-muted-foreground uppercase tracking-wider">Breakfast</th>
                    <th className="px-4 py-3 text-center font-bold text-muted-foreground uppercase tracking-wider">Lunch</th>
                    <th className="px-4 py-3 text-center font-bold text-muted-foreground uppercase tracking-wider">Dinner</th>
                    <th className="px-4 py-3 text-center font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResidents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground font-semibold">
                        {searchQuery ? "No residents match your search query" : "No residents in this list"}
                      </td>
                    </tr>
                  ) : (
                    filteredResidents.map((r) => {
                      const hasNoPlan = r.foodPlan === "NOT_INCLUDED";
                      return (
                        <tr key={r.stayId} className="border-b last:border-b-0 hover:bg-muted/20 transition">
                          <td className="px-4 py-3.5 font-bold text-sm text-foreground">{r.tenantName}</td>
                          <td className="px-4 py-3.5 text-muted-foreground font-medium">{r.roomNumber}-{r.bedLabel}</td>
                          <td className="px-4 py-3.5">
                            <Badge 
                              variant="outline" 
                              className={
                                hasNoPlan 
                                  ? "bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-900 dark:text-slate-600 dark:border-slate-800" 
                                  : r.foodPlan === "BLD" 
                                    ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900"
                                    : "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900"
                              }
                            >
                              {formatFoodPlanLabel(r.foodPlan)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            {hasNoPlan ? (
                              <span className="text-slate-300 dark:text-slate-800 font-semibold">—</span>
                            ) : r.breakfast ? (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 shadow-sm">
                                <Coffee className="h-3.5 w-3.5" />
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-700 font-semibold">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            {hasNoPlan ? (
                              <span className="text-slate-300 dark:text-slate-800 font-semibold">—</span>
                            ) : r.lunch ? (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 shadow-sm">
                                <Sun className="h-3.5 w-3.5" />
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-700 font-semibold">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            {hasNoPlan ? (
                              <span className="text-slate-300 dark:text-slate-800 font-semibold">—</span>
                            ) : r.dinner ? (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 shadow-sm">
                                <Moon className="h-3.5 w-3.5" />
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-700 font-semibold">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            {hasNoPlan ? (
                              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-400 dark:bg-slate-900 dark:text-slate-600">
                                INELIGIBLE
                              </span>
                            ) : r.hasOrder ? (
                              <span className="rounded bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700 dark:bg-green-950/20 dark:text-green-400">
                                ORDERED
                              </span>
                            ) : (
                              <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                SKIPPED / NONE
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
        </>
      ) : null}
    </div>
  );
}
