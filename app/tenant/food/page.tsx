"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Loader2, ChevronLeft, ChevronRight,
  Coffee, Sun, Moon, CalendarDays, Lock
} from "lucide-react";
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

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Meal Plan</h1>
            <p className="text-muted-foreground mt-1 text-sm">Manage your daily food preferences</p>
          </div>
          
          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-1.5 rounded-lg border shadow-sm w-fit">
            <Button variant="ghost" size="sm" onClick={prevWeek} className="h-8 w-8 p-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 px-3 text-sm font-semibold">
              <CalendarDays className="h-4 w-4 text-primary" />
              <span>{formatDateShort(weekStart.toISOString())}</span>
              <span className="text-muted-foreground font-normal">to</span>
              <span>{formatDateShort(weekEnd.toISOString())}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={nextWeek} className="h-8 w-8 p-0">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="w-px h-5 bg-border mx-1"></div>
            <Button variant="ghost" size="sm" onClick={goToday} className="h-8 px-3 text-xs font-bold uppercase tracking-wider">
              Today
            </Button>
          </div>
        </div>

        {loading ? (
          <DashboardSkeleton />
        ) : data ? (
          <div className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {data.days.map((day) => {
                const d = new Date(day.forDate);
                const dayLabel = DAY_LABELS[d.getDay()];
                const isToday = toISODate(d) === toISODate(new Date());

                return (
                  <Card
                    key={day.forDate}
                    className={`overflow-hidden transition-all duration-200 border-2 ${
                      isToday
                        ? "border-primary shadow-md shadow-primary/10 ring-1 ring-primary/20 scale-[1.02] z-10"
                        : "border-transparent border-border/50 hover:border-border hover:shadow-md"
                    } ${!day.isEditable ? "opacity-75 bg-slate-50/50 dark:bg-slate-900/50" : "bg-card"}`}
                  >
                    <div className={`h-2 ${isToday ? "bg-primary" : "bg-muted"}`}></div>
                    
                    <CardHeader className="pb-4 pt-5 px-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className={`text-xs font-bold uppercase tracking-wider ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                            {dayLabel}
                          </p>
                          <h3 className="text-xl font-bold mt-1">
                            {d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          </h3>
                        </div>
                        {isToday && (
                          <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                            Today
                          </span>
                        )}
                        {!day.isEditable && !isToday && (
                          <div className="bg-muted p-2 rounded-full" title="Locked">
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="px-5 pb-6 space-y-3">
                      {/* Breakfast Toggle */}
                      <Button
                        variant={day.breakfast ? "default" : "outline"}
                        className={`w-full justify-start h-12 px-4 shadow-none ${
                          day.breakfast 
                            ? "bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-200 dark:bg-amber-900/40 dark:text-amber-100 dark:border-amber-800" 
                            : "bg-transparent"
                        } ${!day.isEditable ? "cursor-not-allowed opacity-80" : ""}`}
                        onClick={() => handleToggle(day.forDate, "breakfast", day.breakfast)}
                        disabled={!day.isEditable || saving === `${day.forDate}-breakfast`}
                      >
                        {saving === `${day.forDate}-breakfast` ? (
                          <Loader2 className="h-5 w-5 mr-3 animate-spin opacity-50" />
                        ) : (
                          <Coffee className={`h-5 w-5 mr-3 ${day.breakfast ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`} />
                        )}
                        <span className="font-semibold text-base">Breakfast</span>
                      </Button>

                      {/* Lunch Toggle */}
                      <Button
                        variant={day.lunch ? "default" : "outline"}
                        className={`w-full justify-start h-12 px-4 shadow-none ${
                          day.lunch 
                            ? "bg-orange-100 hover:bg-orange-200 text-orange-900 border-orange-200 dark:bg-orange-900/40 dark:text-orange-100 dark:border-orange-800" 
                            : "bg-transparent"
                        } ${!day.isEditable ? "cursor-not-allowed opacity-80" : ""}`}
                        onClick={() => handleToggle(day.forDate, "lunch", day.lunch)}
                        disabled={!day.isEditable || saving === `${day.forDate}-lunch`}
                      >
                        {saving === `${day.forDate}-lunch` ? (
                          <Loader2 className="h-5 w-5 mr-3 animate-spin opacity-50" />
                        ) : (
                          <Sun className={`h-5 w-5 mr-3 ${day.lunch ? "text-orange-500" : "text-muted-foreground"}`} />
                        )}
                        <span className="font-semibold text-base">Lunch</span>
                      </Button>

                      {/* Dinner Toggle */}
                      <Button
                        variant={day.dinner ? "default" : "outline"}
                        className={`w-full justify-start h-12 px-4 shadow-none ${
                          day.dinner 
                            ? "bg-indigo-100 hover:bg-indigo-200 text-indigo-900 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-100 dark:border-indigo-800" 
                            : "bg-transparent"
                        } ${!day.isEditable ? "cursor-not-allowed opacity-80" : ""}`}
                        onClick={() => handleToggle(day.forDate, "dinner", day.dinner)}
                        disabled={!day.isEditable || saving === `${day.forDate}-dinner`}
                      >
                        {saving === `${day.forDate}-dinner` ? (
                          <Loader2 className="h-5 w-5 mr-3 animate-spin opacity-50" />
                        ) : (
                          <Moon className={`h-5 w-5 mr-3 ${day.dinner ? "text-indigo-500 dark:text-indigo-400" : "text-muted-foreground"}`} />
                        )}
                        <span className="font-semibold text-base">Dinner</span>
                      </Button>

                      {/* Locked message */}
                      {!day.isEditable && (
                        <div className="flex items-center justify-center gap-1.5 mt-4 text-[11px] font-medium text-muted-foreground">
                          <Lock className="h-3 w-3" />
                          <span>Orders closed at 10 PM</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
