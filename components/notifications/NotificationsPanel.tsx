"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Bell,
  Check,
  Trash2,
  MailOpen,
  Mail,
  Utensils,
  CreditCard,
  FileText,
  Calendar,
  Inbox,
  ChevronLeft
} from "lucide-react";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/toast";
import { DashboardSkeleton } from "@/components/shared/DashboardSkeleton";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  dismissedFromHome: boolean;
  createdAt: string;
}

export function NotificationsPanel() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const router = useRouter();

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("Failed to load notifications");
      const json = await res.json();
      setNotifications(json.notifications || []);
    } catch (err: any) {
      notify.error(err.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: string, readStatus: boolean) => {
    try {
      setActioningId(id);
      const res = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: readStatus }),
      });
      if (!res.ok) throw new Error("Failed to update notification");
      
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: readStatus } : n))
      );
      notify.success(readStatus ? "Marked as read" : "Marked as unread");
    } catch (err: any) {
      notify.error(err.message || "Something went wrong");
    } finally {
      setActioningId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });
      if (!res.ok) throw new Error("Failed to update notifications");

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      notify.success("All notifications marked as read");
    } catch (err: any) {
      notify.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      setActioningId(id);
      const res = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dismissedFromHome: true }),
      });
      if (!res.ok) throw new Error("Failed to dismiss notification");

      setNotifications((prev) => prev.filter((n) => n.id !== id));
      notify.success("Notification dismissed");
    } catch (err: any) {
      notify.error(err.message || "Something went wrong");
    } finally {
      setActioningId(null);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "unread") return !n.read;
    return true;
  });

  const getNotificationIcon = (type: string) => {
    const t = type.toUpperCase();
    if (t.includes("FOOD")) return <Utensils className="h-4 w-4 text-muted-foreground" />;
    if (t.includes("PAY")) return <CreditCard className="h-4 w-4 text-muted-foreground" />;
    if (t.includes("ONBOARD")) return <FileText className="h-4 w-4 text-muted-foreground" />;
    return <Bell className="h-4 w-4 text-muted-foreground" />;
  };

  if (loading && notifications.length === 0) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="w-full py-8 px-4 md:px-6 xl:px-8 space-y-6">
      {/* App-style Top Bar */}
      <div className="relative flex items-center justify-between mb-2">
        <button 
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-transparent border border-gray-200 dark:border-white/10 text-black dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors z-10"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <h1 className="absolute inset-0 flex items-center justify-center text-[20px] font-black tracking-tight text-black dark:text-white pointer-events-none">
          Notifications
        </h1>

        {notifications.some((n) => !n.read) ? (
          <button 
            onClick={handleMarkAllAsRead}
            title="Mark all as read"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-transparent border border-gray-200 dark:border-white/10 text-black dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors z-10"
          >
            <Check className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-10 h-10" />
        )}
      </div>
      
      <p className="text-[13px] text-gray-500 font-medium text-center mb-8 px-4">
        Stay updated with your stay, meals, and payments.
      </p>

      {/* Control Tabs */}
      <div className="flex items-center justify-between pb-2">
        <Tabs defaultValue="all" className="w-auto" onValueChange={(val) => setActiveTab(val as any)}>
          <TabsList className="bg-muted p-1 rounded-lg">
            <TabsTrigger value="all" className="rounded-md px-3 py-1.5 text-xs font-semibold">
              All ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="unread" className="rounded-md px-3 py-1.5 text-xs font-semibold">
              Unread ({notifications.filter((n) => !n.read).length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main List */}
      {filteredNotifications.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-16 text-center border rounded-2xl bg-card">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted mb-4">
            <Inbox className="h-5 w-5 text-muted-foreground" />
          </div>
          <CardTitle className="text-lg font-bold tracking-tight">You are all caught up!</CardTitle>
          <CardDescription className="mt-1.5 max-w-sm text-muted-foreground">
            {activeTab === "unread" 
              ? "There are no unread notifications right now." 
              : "No notification alerts recorded yet."}
          </CardDescription>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notif) => {
            const dateStr = new Date(notif.createdAt).toLocaleString("en-IN", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <Card
                key={notif.id}
                className={`transition-all duration-150 rounded-xl border border-border hover:border-muted-foreground/30 ${
                  notif.read
                    ? "bg-card/70 opacity-80"
                    : "bg-card border-l-2 border-l-primary"
                }`}
              >
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-start gap-4">
                    {/* Minimalist Icon Box */}
                    <div className="p-2.5 rounded-lg bg-muted shrink-0">
                      {getNotificationIcon(notif.type)}
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground text-sm">
                          {notif.title}
                        </span>
                        <Badge variant="outline" className="text-[10px] py-0 px-2 font-medium capitalize text-muted-foreground bg-muted/40">
                          {notif.type.replace(/_/g, " ").toLowerCase()}
                        </Badge>
                        {!notif.read && (
                          <span className="h-2 w-2 rounded-full bg-primary" title="Unread" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed pt-0.5">
                        {notif.message}
                      </p>
                      <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1 pt-1 font-medium">
                        <Calendar className="h-3 w-3" />
                        {dateStr}
                      </span>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-1 shrink-0 self-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground h-8 w-8"
                        title={notif.read ? "Mark as unread" : "Mark as read"}
                        onClick={() => handleMarkAsRead(notif.id, !notif.read)}
                        disabled={actioningId === notif.id}
                      >
                        {notif.read ? (
                          <Mail className="h-4 w-4" />
                        ) : (
                          <MailOpen className="h-4 w-4" />
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        title="Delete Alert"
                        className="rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                        onClick={() => handleDismiss(notif.id)}
                        disabled={actioningId === notif.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
