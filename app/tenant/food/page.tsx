"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Loader2, AlertCircle, CheckCircle, ChevronLeft, ChevronRight,
  Utensils, Coffee, Sun, Moon, CalendarDays
} from "lucide-react";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/toast";
import { DashboardSkeleton } from "@/components/shared/DashboardSkeleton";

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
  days: FoodOrderDay[];
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function formatDateFull(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export default function TenantFoodPage() {
  const router = useRouter();
  const [data, setData] = useState<FoodOrdersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [saving, setSaving] = useState<string | null>(null);

  const weekEnd = addDays(weekStart, 6);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const startDate = toISODate(weekStart);
      const endDate = toISODate(weekEnd);
      const res = await fetch(`/api/tenant/food-orders?startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to load food orders");
      }
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      notify.error(e.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggle = async (forDate: string, meal: "breakfast" | "lunch" | "dinner", currentValue: boolean) => {
    const day = data?.days.find((d) => d.forDate === forDate);
    if (!day || !day.isEditable) return;

    const key = `${forDate}-${meal}`;
    setSaving(key);

    try {
      const res = await fetch("/api/tenant/food-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          forDate,
          [meal]: !currentValue,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update food order");
      }

      // Update local state
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          days: prev.days.map((d) =>
            d.forDate === forDate
              ? { ...d, [meal]: !currentValue }
              : d
          ),
        };
      });

      notify.success("Saved!");
    } catch (e: any) {
      notify.error(e.message || "Failed to update");
    } finally {
      setSaving(null);
    }
  };

  const prevWeek = () => setWeekStart((d) => addDays(d, -7));
  const nextWeek = () => setWeekStart((d) => addDays(d, 7));
  const goToday = () => setWeekStart(getMonday(new Date()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Food Orders</h1>
        <p className="text-muted-foreground">Select your meals for the week</p>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={prevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={nextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToday}>
            Today
          </Button>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          {formatDateShort(weekStart.toISOString())} — {formatDateShort(weekEnd.toISOString())}
        </div>
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : data ? (
        <div className="space-y-4">
          {/* Cutoff notice */}
          <div className="rounded-lg border bg-blue-50 p-3 text-xs text-blue-700 border-blue-200">
            Meals for tomorrow must be selected before 10:00 PM IST tonight. After that, the selection locks.
          </div>

          {/* Day cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.days.map((day) => {
              const d = new Date(day.forDate);
              const dayLabel = DAY_LABELS[d.getDay()];
              const isToday = toISODate(d) === toISODate(new Date());

              return (
                <div
                  key={day.forDate}
                  className={`rounded-lg border bg-card p-4 shadow-sm transition ${
                    day.isEditable ? "" : "opacity-60"
                  } ${isToday ? "ring-2 ring-primary" : ""}`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase">{dayLabel}</p>
                      <p className="text-sm font-bold">{formatDateShort(day.forDate)}</p>
                    </div>
                    {isToday && (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                        TODAY
                      </span>
                    )}
                    {!day.isEditable && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        LOCKED
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {/* Breakfast */}
                    <label
                      className={`flex items-center gap-2.5 rounded border p-2 transition ${
                        day.isEditable ? "cursor-pointer hover:bg-muted/50" : "cursor-not-allowed"
                      } ${day.breakfast ? "border-primary bg-primary/5" : "border-border"}`}
                    >
                      <input
                        type="checkbox"
                        checked={day.breakfast}
                        onChange={() => handleToggle(day.forDate, "breakfast", day.breakfast)}
                        disabled={!day.isEditable || saving !== null}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Coffee className="h-3.5 w-3.5 text-amber-600" />
                      <span className="text-sm font-medium">Breakfast</span>
                    </label>

                    {/* Lunch */}
                    <label
                      className={`flex items-center gap-2.5 rounded border p-2 transition ${
                        day.isEditable ? "cursor-pointer hover:bg-muted/50" : "cursor-not-allowed"
                      } ${day.lunch ? "border-primary bg-primary/5" : "border-border"}`}
                    >
                      <input
                        type="checkbox"
                        checked={day.lunch}
                        onChange={() => handleToggle(day.forDate, "lunch", day.lunch)}
                        disabled={!day.isEditable || saving !== null}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Sun className="h-3.5 w-3.5 text-orange-500" />
                      <span className="text-sm font-medium">Lunch</span>
                    </label>

                    {/* Dinner */}
                    <label
                      className={`flex items-center gap-2.5 rounded border p-2 transition ${
                        day.isEditable ? "cursor-pointer hover:bg-muted/50" : "cursor-not-allowed"
                      } ${day.dinner ? "border-primary bg-primary/5" : "border-border"}`}
                    >
                      <input
                        type="checkbox"
                        checked={day.dinner}
                        onChange={() => handleToggle(day.forDate, "dinner", day.dinner)}
                        disabled={!day.isEditable || saving !== null}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Moon className="h-3.5 w-3.5 text-indigo-500" />
                      <span className="text-sm font-medium">Dinner</span>
                    </label>
                  </div>

                  {saving && saving.startsWith(day.forDate) && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Saving...
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
