"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ActivityEventType, ActivityLog } from "@prisma/client";
import { createClient } from "@/lib/auth/client";
import { createActivityChannel } from "@/lib/realtime/activity-channel";
import { format } from "date-fns";
import { Download, Filter, Search, Loader2 } from "lucide-react";

interface ActivityLogPageClientProps {
  role: "MAIN_ADMIN" | "WARDEN";
  organizationId: string;
  hostelId?: string; // Always present for Warden; omitted for Admin unless filtering
  showStandaloneHeader?: boolean;
}

const EVENT_COLORS: Record<ActivityEventType, string> = {
  TENANT_PAYMENT_RECEIVED: "#18b92b", // green
  TENANT_ONBOARDED: "#285bc7", // blue
  TENANT_ONBOARDING_STARTED: "#285bc7",
  TENANT_ONBOARDING_PROGRESS: "#3b82f6", // blue-500
  TENANT_ONBOARDING_SUBMITTED: "#8b5cf6", // purple-500
  TENANT_ONBOARDING_RESET: "#f59e0b", // amber-500
  TENANT_PAYMENT_REQUESTED: "#e1a918", // amber
  TENANT_ONBOARDING_CANCELLED: "#e23030", // red
  TICKET_RAISED: "#e23030", // red
  TICKET_STATUS_UPDATED: "#e1a918", // amber
  TICKET_COMMENT_ADDED: "#e1a918",
  FOOD_ORDER_UPDATED: "#e1a918",
  FOOD_CYCLE_CLOSED: "#285bc7", // blue
  FOOD_WALLET_TOPPED_UP: "#18b92b", // green
  FOOD_WALLET_TOPUP_REJECTED: "#e23030", // red
  FOOD_COMPLEMENTARY_ORDER_CREATED: "#e1a918", // amber
  TENANT_CHECKED_OUT: "#767676", // gray
  STAY_STATUS_CHANGED: "#767676",
  SERVICE_REQUEST_CREATED: "#e1a918",
  SERVICE_REQUEST_RESOLVED: "#18b92b",
};

function formatActivityHeader(item: ActivityLog): { text: string; color: string; badge?: string; badgeColor?: string } {
  const meta: any = item.metadata || {};
  const newStatus = meta.newStatus || meta.status;

  switch (item.eventType) {
    case "TICKET_STATUS_UPDATED": {
      if (newStatus === "RESOLVED") {
        return {
          text: `${item.actorName} resolved ticket`,
          color: "#10b981",
          badge: "RESOLVED",
          badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
        };
      }
      if (newStatus === "CLOSED") {
        return {
          text: `${item.actorName} closed ticket`,
          color: "#ef4444",
          badge: "CLOSED",
          badgeColor: "bg-red-500/10 text-red-600 border-red-500/20"
        };
      }
      if (newStatus === "IN_PROGRESS") {
        return {
          text: `${item.actorName} updated ticket to IN PROGRESS`,
          color: "#f59e0b",
          badge: "IN_PROGRESS",
          badgeColor: "bg-amber-500/10 text-amber-600 border-amber-500/20"
        };
      }
      if (newStatus === "OPEN") {
        return {
          text: `${item.actorName} reopened ticket`,
          color: "#3b82f6",
          badge: "OPEN",
          badgeColor: "bg-blue-500/10 text-blue-600 border-blue-500/20"
        };
      }
      return {
        text: `${item.actorName} updated ticket status`,
        color: "#e1a918",
        badge: newStatus || "UPDATED",
        badgeColor: "bg-amber-500/10 text-amber-600 border-amber-500/20"
      };
    }
    case "TICKET_RAISED": {
      return {
        text: `${item.actorName} raised ticket`,
        color: "#ef4444",
        badge: "RAISED",
        badgeColor: "bg-red-500/10 text-red-600 border-red-500/20"
      };
    }
    case "TICKET_COMMENT_ADDED": {
      return {
        text: `${item.actorName} replied on ticket`,
        color: "#3b82f6",
        badge: "REPLY",
        badgeColor: "bg-blue-500/10 text-blue-600 border-blue-500/20"
      };
    }
    case "TENANT_ONBOARDED": {
      return {
        text: `${item.actorName} onboarded tenant`,
        color: "#285bc7",
        badge: "ONBOARDED",
        badgeColor: "bg-blue-500/10 text-blue-600 border-blue-500/20"
      };
    }
    case "TENANT_PAYMENT_RECEIVED": {
      return {
        text: `${item.actorName} payment received`,
        color: "#18b92b",
        badge: "PAID",
        badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
      };
    }
    default: {
      return {
        text: `${item.actorName} ${item.eventType.replace(/_/g, " ").toLowerCase()}`,
        color: EVENT_COLORS[item.eventType] || "#767676"
      };
    }
  }
}

export function ActivityLogPageClient({ role, organizationId, hostelId: initialHostelId, showStandaloneHeader = true }: ActivityLogPageClientProps) {
  const [items, setItems] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  // Filters
  const [selectedTypes, setSelectedTypes] = useState<ActivityEventType[]>([]);
  const [filterHostelId, setFilterHostelId] = useState<string | undefined>(initialHostelId);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const nextCursorRef = useRef<string | null>(null);
  const nextCursorIdRef = useRef<string | null>(null);
  const supabase = createClient();

  const fetchItems = useCallback(async (isLoadMore = false) => {
    try {
      if (!isLoadMore) {
        setLoading(true);
        nextCursorRef.current = null;
        nextCursorIdRef.current = null;
      } else {
        setFetchingMore(true);
      }

      const url = new URL(
        role === "MAIN_ADMIN" ? "/api/admin/activity" : "/api/warden/activity",
        window.location.origin
      );
      
      url.searchParams.set("take", "20");
      if (filterHostelId) url.searchParams.set("hostelId", filterHostelId);
      if (selectedTypes.length > 0) url.searchParams.set("eventTypes", selectedTypes.join(","));
      if (isLoadMore && nextCursorRef.current) url.searchParams.set("cursor", nextCursorRef.current);
      if (isLoadMore && nextCursorIdRef.current) url.searchParams.set("cursorId", nextCursorIdRef.current);

      if (role === "WARDEN" && !filterHostelId) {
        setItems([]);
        setLoading(false);
        setFetchingMore(false);
        setHasMore(false);
        return;
      }

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        const parsedItems = data.items.map((i: any) => ({ ...i, createdAt: new Date(i.createdAt) }));
        
        if (isLoadMore) {
          setItems((prev) => [...prev, ...parsedItems]);
        } else {
          setItems(parsedItems);
        }

        nextCursorRef.current = data.nextCursor;
        nextCursorIdRef.current = data.nextCursorId;
        setHasMore(!!data.nextCursor);
      }
    } catch (err) {
      console.error("Failed to fetch activity log", err);
    } finally {
      setLoading(false);
      setFetchingMore(false);
    }
  }, [role, filterHostelId, selectedTypes]);

  // Initial load and filter changes
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Real-time Subscription
  useEffect(() => {
    // We only listen for realtime updates if we are on page 1 (no scroll cursor)
    const channel = createActivityChannel(
      supabase,
      { organizationId, hostelId: filterHostelId },
      (newItem) => {
        // If filters are active, conditionally skip
        if (selectedTypes.length > 0 && !selectedTypes.includes(newItem.eventType)) return;
        
        setItems((prev) => {
          const exists = prev.some((i) => i.id === newItem.id);
          if (exists) return prev;
          return [newItem, ...prev];
        });
      }
    );

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, filterHostelId, selectedTypes, supabase]);

  const handleExportCSV = () => {
    const url = new URL(
      role === "MAIN_ADMIN" ? "/api/admin/activity/export" : "/api/warden/activity/export",
      window.location.origin
    );
    if (filterHostelId) url.searchParams.set("hostelId", filterHostelId);
    if (selectedTypes.length > 0) url.searchParams.set("eventTypes", selectedTypes.join(","));
    if (startDate) url.searchParams.set("startDate", new Date(startDate).toISOString());
    if (endDate) url.searchParams.set("endDate", new Date(endDate).toISOString());

    // Trigger download
    window.location.href = url.toString();
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      {showStandaloneHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white">Activity Log</h1>
            <p className="text-sm text-[#767676] mt-1 font-medium">Real-time audit log of system events across your organization.</p>
          </div>
          <button 
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-2 premium-button"
          >
            <Download className="size-4" />
            Export CSV
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="premium-card p-4 flex flex-col md:flex-row gap-4 items-center">
        <div className="flex items-center gap-2 text-[#767676]">
          <Filter className="size-4" />
          <span className="text-[13px] font-bold uppercase tracking-wider">Filters</span>
        </div>
        
        <div className="flex-1 flex flex-wrap gap-3 w-full items-center">
          <select 
            className="premium-input max-w-[200px]"
            value={selectedTypes.length > 0 ? selectedTypes[0] : ""}
            onChange={(e) => {
              if (e.target.value) setSelectedTypes([e.target.value as ActivityEventType]);
              else setSelectedTypes([]);
            }}
          >
            <option value="">All Events</option>
            {Object.keys(EVENT_COLORS).map(type => (
              <option key={type} value={type}>{type.replace(/_/g, " ")}</option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <input 
              type="date" 
              className="premium-input max-w-[150px]" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="text-[#767676] font-medium">-</span>
            <input 
              type="date" 
              className="premium-input max-w-[150px]" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {!showStandaloneHeader && (
            <button 
              onClick={handleExportCSV}
              className="ml-auto flex items-center justify-center gap-2 premium-button"
            >
              <Download className="size-4" />
              Export
            </button>
          )}
        </div>
      </div>
      {/* Feed List */}
      <div className="premium-card flex flex-col overflow-hidden min-h-[500px]">
        {loading ? (
          <div className="p-8 flex justify-center items-center h-full">
            <Loader2 className="size-8 animate-spin text-[#767676]" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-[#767676] h-full text-center min-h-[400px]">
            <Search className="size-12 mb-5 opacity-20" />
            <h3 className="text-lg font-semibold text-black dark:text-white mb-2">No activity found</h3>
            <p className="text-sm font-medium">There are no events matching your current filters.</p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-[#dedede] dark:divide-white/10">
            {items.map((item, index) => {
              const headerInfo = formatActivityHeader(item);
              return (
                <div 
                  key={item.id} 
                  className="p-5 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                >
                  <div className="flex gap-4 items-center w-full sm:w-auto">
                    <div 
                      className="size-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: headerInfo.color }}
                    />
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="text-[14px] font-bold text-black dark:text-white tracking-tight">
                          {headerInfo.text}
                        </h4>
                        {headerInfo.badge && (
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${headerInfo.badgeColor || "text-gray-500"}`}>
                            {headerInfo.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[#767676] dark:text-gray-300 text-[13px] leading-snug font-medium">
                        {item.subjectName} {item.subjectType ? <span className="opacity-60 ml-1">({item.subjectType})</span> : ""}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                    <p className="text-[#a1a1a1] text-[13px] font-semibold tracking-wide">
                      {format(item.createdAt, "MMM d, yyyy h:mm a")}
                    </p>
                    {role === "MAIN_ADMIN" && (item as any).hostel?.name && (
                      <span className="text-[#767676] dark:text-gray-300 text-[10px] font-bold uppercase tracking-wider bg-black/5 dark:bg-white/10 px-2 py-1 rounded-md">
                        {(item as any).hostel.name}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            
            {hasMore && (
              <div className="p-8 flex justify-center">
                <button
                  onClick={() => fetchItems(true)}
                  disabled={fetchingMore}
                  className="premium-button-outline flex items-center gap-2"
                >
                  {fetchingMore && <Loader2 className="size-4 animate-spin" />}
                  Load More Events
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
