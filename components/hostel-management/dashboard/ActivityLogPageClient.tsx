"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ActivityEventType, ActivityLog } from "@prisma/client";
import { createClient } from "@/lib/auth/client";
import { createActivityChannel } from "@/lib/realtime/activity-channel";
import { format } from "date-fns";
import { Download, Filter, Search, Loader2 } from "lucide-react";
import { formatActivityAction } from "@/lib/activity";

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
  TICKET_RAISED: "#e23030", // red
  TICKET_STATUS_UPDATED: "#e1a918", // amber
  TICKET_COMMENT_ADDED: "#e1a918",
  FOOD_ORDER_UPDATED: "#e1a918",
  TENANT_CHECKED_OUT: "#767676", // gray
  STAY_STATUS_CHANGED: "#767676",
  SERVICE_REQUEST_CREATED: "#e1a918",
  SERVICE_REQUEST_RESOLVED: "#18b92b",
  FOOD_CYCLE_CLOSED: "#285bc7", // blue
  FOOD_WALLET_TOPPED_UP: "#18b92b", // green
  FOOD_COMPLEMENTARY_ORDER_CREATED: "#767676", // gray
};

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
            {items.map((item, index) => (
              <div 
                key={item.id} 
                className="p-5 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
              >
                <div className="flex gap-4 items-center w-full sm:w-auto">
                  <div 
                    className="size-2 rounded-full shrink-0" 
                    style={{ backgroundColor: EVENT_COLORS[item.eventType] || "#767676" }}
                  />
                  <div className="flex flex-col gap-0.5">
                    <h4 className="text-[14px] text-black dark:text-white tracking-tight">
                      <span className="font-bold">{item.actorName}</span>
                      <span className="text-[#767676] mx-1.5 font-medium">{formatActivityAction(item.eventType)}</span>
                    </h4>
                    <p className="text-[#767676] text-[13px] leading-snug font-medium">
                      {item.subjectName} {item.subjectType ? <span className="opacity-60 ml-1">({item.subjectType})</span> : ""}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-1 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                  <p className="text-[#a1a1a1] text-[13px] font-semibold tracking-wide">
                    {format(item.createdAt, "MMM d, yyyy h:mm a")}
                  </p>
                  {role === "MAIN_ADMIN" && (item as any).hostel?.name && (
                    <span className="text-[#767676] text-[10px] font-bold uppercase tracking-wider bg-black/5 dark:bg-white/10 px-2 py-1 rounded-md">
                      {(item as any).hostel.name}
                    </span>
                  )}
                </div>
              </div>
            ))}
            
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
