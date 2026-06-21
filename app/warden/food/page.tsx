"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Loader2, AlertCircle, ChevronLeft, ChevronRight,
  Coffee, Sun, Moon, Search, Users, Lock, Unlock, CalendarDays
} from "lucide-react";

interface ResidentFoodEntry {
  stayId: string;
  tenantName: string;
  tenantPhotoUrl: string | null;
  roomNumber: string;
  bedLabel: string;
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

function formatDisplayDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00.000+05:30`);
  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

export default function WardenFoodPage() {
  const [data, setData] = useState<FoodStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => toISODate(new Date()));
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/warden/food-stats?date=${selectedDate}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to load food stats");
      }
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const prevDay = () => setSelectedDate((d) => toISODate(addDays(new Date(`${d}T00:00:00.000+05:30`), -1)));
  const nextDay = () => setSelectedDate((d) => toISODate(addDays(new Date(`${d}T00:00:00.000+05:30`), 1)));
  const goToday = () => setSelectedDate(toISODate(new Date()));

  const filteredResidents = data?.residents.filter((r) =>
    r.tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.roomNumber.toLowerCase().includes(searchQuery.toLowerCase())
  ) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kitchen Dashboard</h1>
        <p className="text-muted-foreground">Consolidated meal stats for your hostel</p>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Date Navigation */}
      <div className="flex items-center justify-between">
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
        <div className="flex items-center gap-2 text-sm font-medium">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          {formatDisplayDate(selectedDate)}
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : data ? (
        <>
          {/* Locking Status Badge */}
          <div className="flex items-center gap-2">
            {data.lockingStatus === "OPEN" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                <Unlock className="h-3.5 w-3.5" />
                Orders OPEN
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-sm font-medium text-orange-800">
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
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                Total Residents
              </div>
              <p className="mt-1 text-2xl font-bold">{data.summary.totalResidents}</p>
            </div>
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Coffee className="h-4 w-4 text-amber-600" />
                Breakfast
              </div>
              <p className="mt-1 text-2xl font-bold text-amber-600">{data.summary.breakfastCount}</p>
            </div>
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sun className="h-4 w-4 text-orange-500" />
                Lunch
              </div>
              <p className="mt-1 text-2xl font-bold text-orange-500">{data.summary.lunchCount}</p>
            </div>
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Moon className="h-4 w-4 text-indigo-500" />
                Dinner
              </div>
              <p className="mt-1 text-2xl font-bold text-indigo-500">{data.summary.dinnerCount}</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or room number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-9 w-full rounded-md border bg-transparent pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Resident Checklist Table */}
          <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Resident</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Room</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Breakfast</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Lunch</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Dinner</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResidents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        {searchQuery ? "No residents match your search" : "No active residents found"}
                      </td>
                    </tr>
                  ) : (
                    filteredResidents.map((r) => (
                      <tr key={r.stayId} className="border-b last:border-b-0 hover:bg-muted/30 transition">
                        <td className="px-4 py-3 font-medium">{r.tenantName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.roomNumber}-{r.bedLabel}</td>
                        <td className="px-4 py-3 text-center">
                          {r.breakfast ? (
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                              <Coffee className="h-3 w-3" />
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {r.lunch ? (
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-100 text-orange-700">
                              <Sun className="h-3 w-3" />
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {r.dinner ? (
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                              <Moon className="h-3 w-3" />
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {r.hasOrder ? (
                            <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">
                              ORDERED
                            </span>
                          ) : (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                              NONE
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
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
