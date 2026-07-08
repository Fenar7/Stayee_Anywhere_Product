"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Activity as ActivityIcon } from "lucide-react";
import { ActivityEventType, ActivityLog } from "@prisma/client";
import { createClient } from "@/lib/auth/client";
import { createActivityChannel } from "@/lib/realtime/activity-channel";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { formatActivityAction } from "@/lib/activity";

interface ActivityFeedWidgetProps {
  role: "MAIN_ADMIN" | "WARDEN";
  hostelId?: string;
  organizationId: string;
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
  FOOD_CYCLE_CLOSED: "#10b981", // green-500
  FOOD_WALLET_TOPPED_UP: "#3b82f6", // blue-500
  FOOD_WALLET_TOPUP_REJECTED: "#ef4444", // red-500
  FOOD_COMPLEMENTARY_ORDER_CREATED: "#8b5cf6", // violet-500
};

export function ActivityFeed({ role, hostelId, organizationId }: ActivityFeedWidgetProps) {
  const [items, setItems] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
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
        url.searchParams.set("take", "10"); // widget only shows latest 10
        if (role === "MAIN_ADMIN" && hostelId) {
          url.searchParams.set("hostelId", hostelId);
        }

        const res = await fetch(url.toString());
        if (res.ok) {
          const data = await res.json();
          if (mounted) {
            // Ensure dates are parsed correctly
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
            return [newItem, ...prev].slice(0, 10);
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

  return (
    <div className="rounded-[7px] border border-[#dedede] bg-white dark:bg-zinc-900 p-5 h-full flex flex-col min-h-[400px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[16px] font-semibold text-black dark:text-white">Activity</h3>
        <div className="flex gap-2">
          <button className="border border-[#dedede] text-black dark:text-white rounded-[4px] px-3 py-1.5 text-[13px] font-semibold hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
            Filter
          </button>
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
        ) : items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-[#767676]">
            <p className="text-[13px] font-medium">No activity yet</p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-[#f2f2f2] dark:divide-zinc-800 absolute inset-0 overflow-y-auto pr-2 custom-scrollbar">
            {items.map((item) => (
              <div 
                key={item.id} 
                className="py-3.5 first:pt-0 flex flex-col gap-1 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors -mx-2 px-2 rounded-[4px]"
                onClick={() => item.targetUrl && router.push(item.targetUrl)}
              >
                <h4 
                  className="text-[14px] font-semibold leading-snug"
                  style={{ color: EVENT_COLORS[item.eventType] || "#767676" }}
                >
                  {item.actorName} {formatActivityAction(item.eventType)}
                  <span className="text-black dark:text-white ml-1">
                    {item.subjectName}
                  </span>
                </h4>
                
                <div className="flex items-center justify-between pl-0 mt-0.5">
                  <p className="text-[#a1a1a1] text-[12px]">
                    {formatDistanceToNow(item.createdAt, { addSuffix: true })}
                  </p>
                  {role === "MAIN_ADMIN" && (item as any).hostel?.name && (
                    <span className="text-[#767676] text-[10px] font-bold uppercase tracking-wider border border-[#dedede] dark:border-white/10 px-1.5 py-0.5 rounded-sm">
                      {(item as any).hostel.name}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

