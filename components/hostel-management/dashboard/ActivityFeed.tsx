"use client";

import { useEffect, useState } from "react";
import { ActivityEventType, ActivityLog } from "@prisma/client";
import { createClient } from "@/lib/auth/client";
import { createActivityChannel } from "@/lib/realtime/activity-channel";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Filter } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ActivityFeedWidgetProps {
  role: "MAIN_ADMIN" | "WARDEN";
  hostelId?: string;
  organizationId: string;
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
          color: "#10b981", // emerald
          badge: "RESOLVED",
          badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
        };
      }
      if (newStatus === "CLOSED") {
        return {
          text: `${item.actorName} closed ticket`,
          color: "#ef4444", // red
          badge: "CLOSED",
          badgeColor: "bg-red-500/10 text-red-600 border-red-500/20"
        };
      }
      if (newStatus === "IN_PROGRESS") {
        return {
          text: `${item.actorName} updated ticket to IN PROGRESS`,
          color: "#f59e0b", // amber
          badge: "IN_PROGRESS",
          badgeColor: "bg-amber-500/10 text-amber-600 border-amber-500/20"
        };
      }
      if (newStatus === "OPEN") {
        return {
          text: `${item.actorName} reopened ticket`,
          color: "#3b82f6", // blue
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
        text: `${item.actorName} ${formatActionType(item.eventType)}`,
        color: EVENT_COLORS[item.eventType] || "#767676"
      };
    }
  }
}

export function ActivityFeed({ role, hostelId, organizationId }: ActivityFeedWidgetProps) {
  const [items, setItems] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<"ALL" | "TICKETS" | "ONBOARDING" | "PAYMENTS">("ALL");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;
    
    // 1. Initial Fetch
    const fetchInitial = async () => {
      try {
        const url = new URL(
          role === "MAIN_ADMIN" ? "/api/admin/activity" : "/api/warden/activity",
          window.location.origin
        );
        url.searchParams.set("take", "20");
        if (role === "MAIN_ADMIN" && hostelId) {
          url.searchParams.set("hostelId", hostelId);
        }

        const res = await fetch(url.toString());
        if (res.ok) {
          const data = await res.json();
          if (mounted) {
            setItems(data.items.map((i: any) => ({ ...i, createdAt: new Date(i.createdAt) })));
          }
        }
      } catch (err) {
        console.error("Failed to fetch initial activity log", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchInitial();

    // 2. Real-time Subscription
    const channel = createActivityChannel(
      supabase,
      { organizationId, hostelId },
      (newItem) => {
        if (mounted) {
          setItems((prev) => {
            const exists = prev.some((i) => i.id === newItem.id);
            if (exists) return prev;
            return [newItem, ...prev].slice(0, 20);
          });
        }
      }
    );

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [role, hostelId, organizationId, supabase]);

  const handleViewAll = () => {
    const route = role === "MAIN_ADMIN" ? "/admin/activity" : "/warden/activity";
    router.push(route);
  };

  const filteredItems = items.filter((item) => {
    if (filterCategory === "TICKETS") {
      return (
        item.eventType === "TICKET_RAISED" ||
        item.eventType === "TICKET_STATUS_UPDATED" ||
        item.eventType === "TICKET_COMMENT_ADDED"
      );
    }
    if (filterCategory === "ONBOARDING") {
      return (
        item.eventType.startsWith("TENANT_ONBOARDING") ||
        item.eventType === "TENANT_ONBOARDED" ||
        item.eventType === "TENANT_CHECKED_OUT"
      );
    }
    if (filterCategory === "PAYMENTS") {
      return (
        item.eventType === "TENANT_PAYMENT_RECEIVED" ||
        item.eventType === "TENANT_PAYMENT_REQUESTED" ||
        item.eventType.startsWith("FOOD_WALLET")
      );
    }
    return true;
  });

  return (
    <div className="rounded-[7px] border border-[#dedede] bg-white dark:bg-zinc-900 p-5 h-full flex flex-col min-h-[400px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[16px] font-semibold text-black dark:text-white flex items-center gap-2">
          Activity
          {filterCategory !== "ALL" && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/40">
              ● {filterCategory}
            </span>
          )}
        </h3>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="border border-[#dedede] text-black dark:text-white rounded-[4px] px-3 py-1.5 text-[13px] font-semibold hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5 outline-none">
                <Filter className="w-3.5 h-3.5" />
                Filter
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-xl p-1 shadow-lg">
              <DropdownMenuItem
                onClick={() => setFilterCategory("ALL")}
                className={`text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer ${filterCategory === "ALL" ? "bg-gray-100 dark:bg-white/10 font-bold" : ""}`}
              >
                All Activities
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setFilterCategory("TICKETS")}
                className={`text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer ${filterCategory === "TICKETS" ? "bg-gray-100 dark:bg-white/10 font-bold text-amber-600" : ""}`}
              >
                🎫 Tickets & Complaints
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setFilterCategory("ONBOARDING")}
                className={`text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer ${filterCategory === "ONBOARDING" ? "bg-gray-100 dark:bg-white/10 font-bold text-blue-600" : ""}`}
              >
                👤 Onboarding & Tenants
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setFilterCategory("PAYMENTS")}
                className={`text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer ${filterCategory === "PAYMENTS" ? "bg-gray-100 dark:bg-white/10 font-bold text-emerald-600" : ""}`}
              >
                💳 Payments & Rent
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button 
            onClick={handleViewAll}
            className="bg-[#282828] text-[#58ff48] rounded-[4px] px-3 py-1.5 text-[13px] font-semibold hover:opacity-90 transition-opacity"
          >
            Know More
          </button>
        </div>
      </div>

      <div className="flex flex-col flex-1 relative overflow-hidden">
        {loading ? (
          <div className="flex flex-col gap-4 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col gap-2 py-2">
                <div className="h-4 bg-black/5 dark:bg-white/10 rounded w-3/4"></div>
                <div className="h-3 bg-black/5 dark:bg-white/10 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-[#767676]">
            <p className="text-[13px] font-medium">No activity matching filter</p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-[#f2f2f2] dark:divide-zinc-800 absolute inset-0 overflow-y-auto pr-2 custom-scrollbar">
            {filteredItems.map((item) => {
              const headerInfo = formatActivityHeader(item);
              return (
                <div 
                  key={item.id} 
                  className="py-3.5 first:pt-0 flex flex-col gap-1 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors -mx-2 px-2 rounded-[4px]"
                  onClick={() => item.targetUrl && router.push(item.targetUrl)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 
                      className="text-[14px] font-semibold leading-snug"
                      style={{ color: headerInfo.color }}
                    >
                      {headerInfo.text}
                    </h4>
                    {headerInfo.badge && (
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${headerInfo.badgeColor || "text-gray-500"}`}>
                        {headerInfo.badge}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-[#767676] dark:text-gray-300 text-[13px] leading-snug pl-0 line-clamp-2">
                    {item.subjectName}
                  </p>
                  
                  <div className="flex items-center justify-between pl-0 mt-0.5">
                    <p className="text-[#a1a1a1] text-[12px]">
                      {formatDistanceToNow(item.createdAt, { addSuffix: true })}
                    </p>
                    {role === "MAIN_ADMIN" && (item as any).hostel?.name && (
                      <span className="text-[#767676] dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider border border-[#dedede] dark:border-white/10 px-1.5 py-0.5 rounded-sm">
                        {(item as any).hostel.name}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function formatActionType(type: ActivityEventType): string {
  switch (type) {
    case "TENANT_PAYMENT_RECEIVED": return "payment received";
    case "TENANT_ONBOARDED": return "onboarded tenant";
    case "TENANT_ONBOARDING_STARTED": return "started onboarding";
    case "TENANT_ONBOARDING_PROGRESS": return "updated onboarding form";
    case "TENANT_ONBOARDING_SUBMITTED": return "submitted registration (awaiting review)";
    case "TENANT_ONBOARDING_RESET": return "restarted onboarding draft";
    case "TENANT_PAYMENT_REQUESTED": return "payment requested";
    case "TENANT_ONBOARDING_CANCELLED": return "cancelled onboarding";
    case "TENANT_CHECKED_OUT": return "checked out tenant";
    case "TICKET_RAISED": return "raised ticket";
    case "TICKET_STATUS_UPDATED": return "updated ticket status";
    case "TICKET_COMMENT_ADDED": return "commented on ticket";
    case "FOOD_ORDER_UPDATED": return "updated food order";
    default: return type.replace(/_/g, " ").toLowerCase();
  }
}
